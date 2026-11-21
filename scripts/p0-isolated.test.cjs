const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {createRequire}=require('node:module');
const root=process.env.LINGUA_P0_COMPILED;
if(!root)throw Error('LINGUA_P0_COMPILED missing');
const offline=require(path.join(root,'client/src/lib/offline-learning.js'));
const srs=require(path.join(root,'shared/learning.js'));
const {privateKnowledgeItemKey}=require(path.join(root,'server/knowledge-ownership.js'));
let storage;
function browser(){
 storage=new Map();
 global.window={localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},dispatchEvent:()=>true};
}
afterEach(()=>{delete global.window;});
const word={itemKey:'reading-lab:ready',kind:'word',text:'ready',normalizedText:'ready',language:'en'};
test('queue isolates different learners',()=>{
 browser();offline.enqueueLearningOperation(501,{type:'review',knowledgeItemId:7,rating:'good'});
 assert.equal(offline.pendingLearningCount(501),1);assert.equal(offline.pendingLearningCount(502),0);
 assert.deepEqual([...storage.keys()],['lingua.learning.pending.v2.user.501']);
});
test('legacy unauthenticated queue never crosses account',()=>{
 browser();storage.set('lingua.learning.pending.v1','[{"id":"secret"}]');
 assert.equal(offline.pendingLearningCount(501),0);assert.ok(storage.has('lingua.learning.pending.v1'));
});
test('stable operation ID reaches replay for lost acknowledgment',async()=>{
 browser();const op=offline.createPendingLearningOperation({type:'review',knowledgeItemId:7,rating:'good'});
 offline.enqueueLearningOperation(503,op);let seen;
 const ack=await offline.replayPendingLearningOperations(503,{save:async()=>0,review:async x=>seen=x.operationId,remove:async()=>{}});
 assert.equal(op.id,seen);assert.equal(ack.synced,true);assert.equal(ack.remaining,0);
});
test('save ACK preserves referenced review when later API fails',async()=>{
 browser();offline.enqueueLearningOperation(504,{type:'save',clientKey:'ready',payload:word});
 offline.enqueueLearningOperation(504,{type:'review',clientKey:'ready',rating:'good'});
 let first;
 await assert.rejects(offline.replayPendingLearningOperations(504,{save:async()=>77,review:async x=>{first=x.operationId;throw Error('offline')},remove:async()=>{}}),/offline/);
 const after=offline.getPendingLearningOperations(504);
 assert.equal(after.length,1);assert.equal(after[0].knowledgeItemId,77);
 const result=await offline.replayPendingLearningOperations(504,{save:async()=>{throw Error('unexpected save')},review:async x=>{assert.equal(x.operationId,first);assert.equal(x.knowledgeItemId,77)},remove:async()=>{}});
 assert.equal(result.synced,true);
});
test('unresolved review blocks following operations and remains pending',async()=>{
 browser();offline.enqueueLearningOperation(505,{type:'review',clientKey:'missing',rating:'good'});
 offline.enqueueLearningOperation(505,{type:'remove',knowledgeItemId:77});let other=false;
 await assert.rejects(offline.replayPendingLearningOperations(505,{save:async()=>77,review:async()=>{},remove:async()=>{other=true}}),/no confirmed server item ID/);
 assert.equal(offline.pendingLearningCount(505),2);assert.equal(other,false);
});
test('late failed save is moved before its dependent review',()=>{
 browser();offline.enqueueLearningOperation(506,{type:'review',clientKey:'ready',rating:'good'});
 offline.enqueueLearningOperation(506,{type:'save',clientKey:'ready',payload:word});
 assert.deepEqual(offline.getPendingLearningOperations(506).map(x=>x.type),['save','review']);
});
test('storage quota errors keep per-owner volatile operations',()=>{
 browser();global.window.localStorage.setItem=()=>{throw Error('quota')};
 offline.enqueueLearningOperation(507,{type:'review',knowledgeItemId:7,rating:'good'});
 assert.equal(offline.pendingLearningCount(507),1);
});
test('deduplication preserves first operation once',()=>{
 const op=offline.createPendingLearningOperation({type:'review',knowledgeItemId:7,rating:'good'});
 assert.equal(offline.deduplicateLearningOperations([op,op]).length,1);
});
test('stable jitter matches replay when user and item supplied',()=>{
 const now=new Date('2026-11-20T12:00:00Z');const base={...srs.createInitialReviewState('7',now),state:'review',intervalDays:100,repetitions:3};
 const expected=srs.applySrsReview(base,'good',now,{userId:'501',itemId:'7'});
 const actual=srs.replayReviewLogs('7',[{knowledgeItemId:'7',rating:'good',createdAt:now.toISOString(),operationId:'test12345'}],base,{userId:'501',itemId:'7'});
 assert.equal(actual.intervalDays,expected.intervalDays);assert.equal(actual.dueAt,expected.dueAt);
});
test('relearning repeated failure remains in relearning',()=>{
 const now=new Date('2026-11-20T12:00:00Z');const base={...srs.createInitialReviewState('7',now),state:'review',intervalDays:6};
 const lapse=srs.applySrsReview(base,'again',now,{jitterRatio:0});const again=srs.applySrsReview(lapse,'again',now,{jitterRatio:0});
 assert.equal(again.state,'relearning');assert.equal(again.lapses,lapse.lapses);
});
test('source SRS fixed intervals for easy and hard',()=>{
 const now=new Date('2026-11-20T12:00:00Z');
 const easy=srs.applySrsReview(srs.createInitialReviewState('7',now),'easy',now,{jitterRatio:0});
 assert.equal(easy.intervalDays,4);assert.equal(easy.easeFactor,2.6);
 const hard=srs.applySrsReview({...srs.createInitialReviewState('7',now),state:'review',intervalDays:10},'hard',now,{jitterRatio:0});
 assert.equal(hard.intervalDays,12);
});

test('private knowledge keys differ by learner and cannot claim shared key',async()=>{
 const first=await privateKnowledgeItemKey(501,'reading-lab:ready');
 const second=await privateKnowledgeItemKey(502,'reading-lab:ready');
 assert.match(first,/^learner:[a-f0-9]{64}$/);
 assert.notEqual(first,second);
 assert.notEqual(first,'reading-lab:ready');
 assert.equal(first,await privateKnowledgeItemKey(501,'reading-lab:ready'));
});
test('same-tab concurrent replay uses one in-flight dispatch',async()=>{
 browser();offline.enqueueLearningOperation(508,{type:'review',knowledgeItemId:7,rating:'good'});
 let complete;let sent=0;
 const api={save:async()=>0,review:async()=>{sent++;await new Promise(resolve=>complete=resolve);},remove:async()=>{}};
 const a=offline.replayPendingLearningOperations(508,api);
 const b=offline.replayPendingLearningOperations(508,api);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(sent,1);complete();
 const result=await Promise.all([a,b]);
 assert.ok(result.every(x=>x.synced));
 assert.equal(sent,1);
});
