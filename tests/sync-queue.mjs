import assert from "node:assert/strict";
class Storage { constructor(){this.map=new Map()} getItem(k){return this.map.has(k)?this.map.get(k):null} setItem(k,v){this.map.set(k,String(v))} removeItem(k){this.map.delete(k)} }
globalThis.localStorage=new Storage();
globalThis.window={localStorage,dispatchEvent(){},addEventListener(){}};
globalThis.CustomEvent=class { constructor(type,init={}){this.type=type;this.detail=init.detail} };
Object.defineProperty(globalThis,"navigator",{value:{onLine:true},configurable:true});
globalThis.atob=value=>Buffer.from(value,'base64').toString('binary');
const { supabaseApi }=await import('../shared/js/supabase-api.js');
const { SyncQueue }=await import('../shared/js/sync-queue.js');
await supabaseApi.startDemo('student');
const queue=new SyncQueue(localStorage);
const payload={gameSlug:'gobak-sodor',score:1234,accuracy:80,result:'won',mode:'Solo',difficulty:'Normal',levelId:'Jawa',durationSeconds:60,correctCount:5,questionCount:6,metadata:{clientSessionId:'queue-test-1'}};
queue.enqueue(supabaseApi.user.id,payload,'offline');
queue.enqueue(supabaseApi.user.id,payload,'duplicate');
assert.equal(queue.summary(supabaseApi.user.id).total,1);
const result=await queue.flush(supabaseApi.user.id,{force:true});
assert.equal(result.synced,1);
assert.equal(result.remaining,0);
console.log('sync-queue: PASS');
