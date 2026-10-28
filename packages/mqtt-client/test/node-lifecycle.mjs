import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mqtt-node-lifecycle-'));
try {
 let code=ts.transpileModule(fs.readFileSync(new URL('../examples/node.demo.ts',import.meta.url),'utf8').split('async function main()')[0],{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
 code=code.replace("from '@esutils/mqtt-client'",`from '${new URL('../dist/index.mjs',import.meta.url).href}'`).replace("from 'net'","from './net.mjs'");
 fs.writeFileSync(path.join(dir,'client.mjs'),code);
 fs.writeFileSync(path.join(dir,'net.mjs'),`import {EventEmitter} from 'node:events';export const sockets=[];export function connect(options,ready){const s=new EventEmitter();s.write=(b,cb)=>cb();s.destroy=()=>queueMicrotask(()=>s.emit('close'));s.establish=ready;sockets.push(s);return s;}`);
 const net=await import(pathToFileURL(path.join(dir,'net.mjs')).href);
 const {Client}=await import(pathToFileURL(path.join(dir,'client.mjs')).href);
 const c=new Client({url:new URL('mqtt://127.0.0.1'),protocolVersion:4,clientId:'local',keepalive:0,connectTimeout:25});
 const url=new URL('mqtt://127.0.0.1');
 let pending=c.open(url);const outcome=pending.then(()=> 'resolved',()=> 'rejected');await new Promise(r=>setTimeout(r,0));await c.close();assert.equal(await outcome,'rejected');
 pending=c.open(url);const timeout=pending.then(()=> 'resolved',()=> 'rejected');assert.equal(await timeout,'rejected');
 pending=c.open(url);await new Promise(r=>setTimeout(r,0));net.sockets.at(-1).establish();await pending;
 c.connectionState='connected';await c.disconnect();assert.equal(c.connectionState,'disconnected');
 const next=c.open(url);await new Promise(r=>setTimeout(r,0));net.sockets.at(-1).establish();await next;c.connectionState='connecting';
 net.sockets[0].emit('close');net.sockets[0].emit('error',new Error('old'));net.sockets[0].establish();assert.equal(c.connectionState,'connecting');await c.close();c.stopTimers();
 console.log('PASS Node example: cancelled open, TCP timeout, active disconnect, stale socket callbacks');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
