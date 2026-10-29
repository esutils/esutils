import assert from 'node:assert/strict';
import {BaseClient} from '../dist/base-client.mjs';
class Probe extends BaseClient {
 packets=[];async open(){}async close(){}validateURL(){}
 async send(p){this.packets.push(p)}startReconnectTimer(){return true}
}
const create=()=>{const c=new Probe({url:new URL('mqtt://localhost'),protocolVersion:4,keepalive:0,subscribeTimeout:60000});c.connectionState='connected';return c};
const tick=()=>new Promise(r=>setImmediate(r));
const observe=p=>{const state={value:'pending'};state.done=p.then(()=>state.value='resolved',()=>state.value='rejected');return state};
const ack=(c,p,code=0)=>c.handleSuback({cmd:'suback',messageId:p.messageId,granted:p.subscriptions.map(()=>code)});
for(const [name,test]of Object.entries({
 async merged(c){const a=observe(c.subscribe('cmd',0));const b=observe(c.subscribe('cmd',0));await tick();assert.equal(c.packets.length,1);ack(c,c.packets[0]);await Promise.all([a.done,b.done]);assert.equal(a.value,'resolved');assert.equal(b.value,'resolved');assert.equal(c.getSubscriptionState('cmd'),'acknowledged')},
 async rejected(c){const a=observe(c.subscribe('cmd',0));const b=observe(c.subscribe('cmd',0));await tick();ack(c,c.packets[0],128);await tick();assert.equal(a.value,'rejected');assert.equal(b.value,'rejected')},
 async disconnected(c){const a=observe(c.subscribe('cmd',0));const b=observe(c.subscribe('cmd',0));await tick();c.connectionClosed();await tick();assert.equal(a.value,'rejected');assert.equal(b.value,'rejected');assert.equal(c.unresolvedSubscribes.size,0)},
 async differentQos(c){const a=observe(c.subscribe('cmd',0));const b=observe(c.subscribe('cmd',1));await tick();assert.equal(b.value,'rejected');ack(c,c.packets[0]);await tick();assert.equal(a.value,'resolved')},
 async offlineCancelled(c){c.connectionState='offline';const a=observe(c.subscribe('cmd',0));const b=observe(c.subscribe('cmd',0));await c.disconnect();await tick();assert.equal(a.value,'rejected');assert.equal(b.value,'rejected');assert.equal(c.unresolvedSubscribes.size,0)},
 async overlappingBatches(c){const a=observe(c.subscribe(['a','b'],0));const b=observe(c.subscribe(['b','c'],0));await tick();assert.deepEqual(c.packets.map(p=>p.subscriptions.map(s=>s.topic)),[['a','b'],['c']]);ack(c,c.packets[1]);await tick();assert.equal(a.value,'pending');assert.equal(b.value,'pending');ack(c,c.packets[0]);await tick();assert.equal(a.value,'resolved');assert.equal(b.value,'resolved');assert.equal(c.unresolvedSubscribes.size,0)},
 async atomicConflict(c){const original=observe(c.subscribe('cmd',0));const conflicting=observe(c.subscribe([{topic:'new',qos:0},{topic:'cmd',qos:1}]));await tick();assert.equal(conflicting.value,'rejected');assert.equal(c.getSubscriptionState('new'),undefined);assert.equal(c.packets.length,1);ack(c,c.packets[0]);await tick();assert.equal(original.value,'resolved')},
 async staleAckAfterRecovery(c){const old=observe(c.subscribe('cmd',0));await tick();const oldPacket=c.packets[0];c.subscriptionFailed(Error('SUBACK timeout'));await tick();assert.equal(old.value,'rejected');c.connectionState='connecting';c.openConnectionInit();await c.handleConnack({cmd:'connack',returnCode:0});const current=observe(c.subscribe('cmd',0));await tick();const newPacket=c.packets.at(-1);assert.notEqual(newPacket.messageId,oldPacket.messageId);ack(c,oldPacket);await tick();assert.equal(current.value,'pending');assert.equal(c.getSubscriptionState('cmd'),'unacknowledged');ack(c,newPacket);await tick();assert.equal(current.value,'resolved')},
 async offlineMergedLogin(c){c.connectionState='offline';const a=observe(c.subscribe('cmd',0));const b=observe(c.subscribe('cmd',0));c.connectionState='connecting';c.openConnectionInit();await c.handleConnack({cmd:'connack',returnCode:0});assert.equal(c.packets.length,1);ack(c,c.packets[0]);await tick();assert.equal(a.value,'resolved');assert.equal(b.value,'resolved')},
 async duplicateBatch(c){const a=observe(c.subscribe(['cmd','cmd'],0));await tick();assert.equal(c.packets[0].subscriptions.length,1);ack(c,c.packets[0]);await tick();assert.equal(a.value,'resolved')},
})){const c=create();try{await test(c);console.log('PASS',name)}catch(e){process.exitCode=1;console.error('FAIL',name,e.message)}finally{c.stopTimers()}}
