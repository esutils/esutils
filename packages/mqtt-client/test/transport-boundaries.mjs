import assert from 'node:assert/strict';
import { BaseClient } from '../dist/base-client.mjs';
import { encode } from '../../mqtt-packet/dist/index.mjs';

const options = {url:new URL('mqtt://localhost'), protocolVersion:4, keepalive:0,
  utf8Encoder:new TextEncoder(), utf8Decoder:new TextDecoder(), maxPacketSize:256};
const tick = () => new Promise(resolve => setImmediate(resolve));
class Probe extends BaseClient {
  received=[]; sent=[]; closed=0; retries=0;
  async open() {} async close() { this.closed++; } validateURL() {}
  async send(packet) { this.sent.push(packet); }
  startReconnectTimer() { this.retries++; return true; }
  constructor(extra={}) {
    super({...options,...extra});
    this.connectionState='connected';
    this.on('message',(topic,payload)=>this.received.push({topic,payload}));
  }
}
const clients=[];
const create=extra=>{const client=new Probe(extra);clients.push(client);return client;};
const publish=(size=150)=>encode({cmd:'publish',qos:0,topic:'设备/😀',payload:new Uint8Array(size).fill(7)},options.utf8Encoder,options);
const join=(...frames)=>Uint8Array.from(frames.flatMap(frame=>Array.from(frame)));
const tests={
  async everySplitPoint() {
    const frame=publish();
    for(let cut=0;cut<=frame.length;cut++) {
      const c=create();
      c.bytesReceived(frame.subarray(0,cut));
      c.bytesReceived(join(frame.subarray(cut),Uint8Array.of(0xd0,0)));
      assert.equal(c.received.length,1,`split ${cut}`);
      assert.equal(c.received[0].topic,'设备/😀');
      assert.deepEqual(c.received[0].payload,new Uint8Array(150).fill(7));
      assert.equal(c.buffer,undefined);
    }
  },
  async exactSizeLimit() {
    const frame=publish();
    const allowed=create({maxPacketSize:frame.length});allowed.bytesReceived(frame);
    assert.equal(allowed.received.length,1);
    const rejected=create({maxPacketSize:frame.length-1});
    assert.throws(()=>rejected.bytesReceived(frame.subarray(0,3)),/size/i);
    assert.equal(rejected.buffer,undefined);
    assert.equal(rejected.received.length,0);
  },
  async coalescedPacketsExceedAggregateLimit() {
    const frame=publish(40),c=create({maxPacketSize:64});
    c.bytesReceived(join(frame,frame,frame,frame));
    assert.equal(c.received.length,4);
    assert.equal(c.buffer,undefined);
  },
  async partialFrameDoesNotCrossReconnect() {
    const c=create(),frame=publish();c.bytesReceived(frame.subarray(0,20));
    assert(c.buffer);
    c.openConnectionInit();c.connectionState='connecting';
    c.bytesReceived(Uint8Array.of(0x20,2,0,0));await tick();
    c.bytesReceived(frame);
    assert.equal(c.received.length,1);assert.equal(c.buffer,undefined);
  },
  async malformedFrameDoesNotPoisonNextConnection() {
    const c=create();assert.throws(()=>c.bytesReceived(Uint8Array.of(0x30,2,0,5)),/topic/);
    c.openConnectionInit();c.connectionState='connecting';
    await c.handleConnack({cmd:'connack',returnCode:0});
    c.bytesReceived(publish());assert.equal(c.received.length,1);assert.equal(c.buffer,undefined);
  },
  async staleAsyncReceiveFailureCannotCloseNewConnection() {
    let rejectStore;
    const incomingStore={has:()=>new Promise((_,reject)=>{rejectStore=reject}),store:async()=>{},discard:async()=>{}};
    const c=create({incomingStore});
    c.packetReceived({cmd:'publish',qos:2,dup:true,messageId:7,topic:'cmd',payload:Uint8Array.of(1)});
    c.openConnectionInit();c.connectionState='connected';
    rejectStore(Error('old storage failure'));await tick();
    assert.equal(c.closed,0);assert.equal(c.retries,0);assert.equal(c.connectionState,'connected');
  },
  async staleRefusalCompletionCannotRejectNewLogin() {
    const c=create();c.connectionState='connecting';let finishClose,rejected=false;
    c.close=()=>new Promise(resolve=>{finishClose=resolve});
    const old=c.handleConnack({cmd:'connack',returnCode:3});
    c.openConnectionInit();c.connectionState='connecting';
    c.unresolvedConnect={reject:()=>{rejected=true},resolve:()=>{}};
    finishClose();await old;
    assert.equal(rejected,false);assert.equal(c.retries,0);assert.equal(c.connectionState,'connecting');
  },
  async immediateConnackDoesNotLeaveConnectTimer() {
    const c=create();c.connectionState='offline';
    c.send=async packet=>{if(packet.cmd==='connect')await c.handleConnack({cmd:'connack',returnCode:0});};
    await c.connect();await tick();
    assert.equal(c.connectionState,'connected');assert.equal(c.timerExists('connect'),false);
  },
  async repeatedPartialReconnectsReleaseBookkeeping() {
    const c=create(),frame=publish();
    for(let i=0;i<100;i++) {
      c.bytesReceived(frame.subarray(0,20));c.openConnectionInit();c.bytesReceived(frame);
      assert.equal(c.received.length,1);c.received=[];
      assert.equal(c.buffer,undefined);assert.equal(c.unacknowledgedSubscribes.size,0);
      assert.equal(c.unresolvedSubscribes.size,0);
    }
  },
};
for(const [name,test] of Object.entries(tests)) {
  let timeout;
  try {
    await Promise.race([test(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('test deadline')),2000);})]);
    console.log('PASS',name);
  } catch(error) {process.exitCode=1;console.error('FAIL',name,error.message);}
  finally {clearTimeout(timeout);for(const client of clients)client.stopTimers();clients.length=0;}
}
