import assert from 'node:assert/strict';
import {BaseClient} from '../dist/base-client.mjs';
class Probe extends BaseClient {
 packets=[];closed=0; now=0;
 async open(){} async close(){this.closed++} validateURL(){}
 async send(p){this.packets.push(p)} startReconnectTimer(){return true}
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clients=[];
async function create(extra={}){const c=new Probe({url:new URL('mqtt://127.0.0.1'),protocolVersion:4,clientId:'local',keepalive:0,subscribeTimeout:40,...extra});clients.push(c);c.connectionState='connecting';c.openConnectionInit();await c.handleConnack({cmd:'connack',returnCode:0,sessionPresent:false});return c}
function subscribe(c,topics){let outcome='pending';const done=c.subscribe(topics,0).then(()=>outcome='resolved',()=>outcome='rejected');return {done,get outcome(){return outcome}}}
const last=c=>c.packets.filter(p=>p.cmd==='subscribe').at(-1);
function ack(c,p,granted){c.handleSuback({cmd:'suback',messageId:p.messageId,granted})}
const cases={
 async recoveryOwnership(){const c=await create();const events=[];c.on('subscriptionRecovery',(topics)=>events.push(topics));const p=subscribe(c,'a');await sleep(0);assert.equal(c.getSubscriptionState('a'),'unacknowledged');await sleep(65);assert.equal(p.outcome,'rejected');assert.equal(c.getSubscriptionState('a'),'pending');assert.deepEqual(events,[['a']])},
 async rejectionIsolation(){const c=await create();const p=subscribe(c,['allowed','denied']);await sleep(0);const packet=last(c);ack(c,packet,[0,128]);await sleep(0);assert.equal(p.outcome,'rejected');assert.equal(c.connectionState,'connected');assert.equal(c.subscriptions[0].state,'acknowledged');assert.equal(c.subscriptions[1].state,'rejected');const before=c.packets.length;c.connectionState='connecting';c.openConnectionInit();await c.handleConnack({cmd:'connack',returnCode:0,sessionPresent:false});assert.deepEqual(last(c).subscriptions.map(s=>s.topic),['allowed'])},
 async activeDisconnect(){const c=await create();await c.disconnect();assert.equal(c.connectionState,'disconnected');const connecting=c.connect().catch(()=>{});await sleep(0);assert.equal(c.connectionState,'connecting');c.notifyConnectRejected(new Error('test cleanup'))},
 async batch(){const c=await create();const p=subscribe(c,['a','b']);await sleep(0);ack(c,last(c),[0,0]);await sleep(0);assert.equal(p.outcome,'resolved')},
 async denied(){const c=await create();const p=subscribe(c,'a');await sleep(0);ack(c,last(c),[128]);await sleep(0);assert.equal(p.outcome,'rejected');assert.equal(c.unresolvedSubscribes.size,0)},
 async timeout(){const c=await create();const p=subscribe(c,'a');await sleep(65);assert.equal(p.outcome,'rejected');assert.equal(c.unacknowledgedSubscribes.size,0)},
 async persistent(){const c=await create({clean:false});subscribe(c,'a');await sleep(65);assert.equal(c.subscriptions[0].state,'pending');const before=c.packets.length;c.connectionState='connecting';c.openConnectionInit();await c.handleConnack({cmd:'connack',returnCode:0,sessionPresent:true});assert(c.packets.slice(before).some(p=>p.cmd==='subscribe'))},
 async deadlines(){const c=await create({subscribeTimeout:200});const a=subscribe(c,'a');await sleep(0);const first=last(c);await sleep(100);const b=subscribe(c,'b');await sleep(0);ack(c,first,[0]);await sleep(120);assert.equal(a.outcome,'resolved');assert.equal(b.outcome,'pending');await sleep(110);assert.equal(b.outcome,'rejected')},
 async late(){const c=await create();const p=subscribe(c,'a');await sleep(0);const old=last(c);await sleep(65);ack(c,old,[0]);await sleep(0);assert.equal(p.outcome,'rejected');assert.equal(c.subscriptions[0].state,'pending')},
 async disconnect(){const c=await create();const p=subscribe(c,'a');await sleep(0);c.connectionClosed();await sleep(0);assert.equal(p.outcome,'rejected');assert.equal(c.subscriptions[0].state,'pending')},
};
for(const [name,test]of Object.entries(cases)){try{await test();console.log('PASS',name)}catch(e){process.exitCode=1;console.error('FAIL',name,e.message)}finally{for(const c of clients)c.stopTimers()}}
