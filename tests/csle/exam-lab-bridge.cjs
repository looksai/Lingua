'use strict';
// Laboratory only: backend-owned port injected by trusted fixture. No real
// learner identity, exam results, raw answers, free-form learner text or secrets.
const REQUESTS=Object.freeze({
 reading:"Please help me practise identifying a main idea in a fictional short text.",
 listening:"Please help me practise identifying details in a fictional spoken notice."
});
function createExamLabBridge({port,synthetic}){
 if(synthetic!==true||!port||!["state","send","returnToAnchor"].every(k=>typeof port[k]==="function"))throw Error("Synthetic lab port required");
 let busy=false,blocked=false;
 function state(){const s=port.state();return {sequence:s.sequence,phase:blocked?"blocked":busy?"pending":s.phase};}
 async function dispatch(action){
  const before=state();
  if(blocked||before.phase==="blocked")return {status:"blocked",completion:"unknown"};
  if(busy||before.phase==="pending")return {status:"busy"};
  if(before.phase!=="ready"||!Number.isSafeInteger(before.sequence)||before.sequence<0)throw Error("Invalid lab state");
  busy=true;
  try{
   const r=await action();
   if(r?.status!=="ok"){blocked=true;return {status:"uncertain",completion:"unknown"};}
   const d=r.data;
   if(d?.sequence!==before.sequence+1||!["reading","listening"].includes(d.anchor?.lessonId)||typeof d.anchor?.objective!=="string"||d.anchor.objective.length>500||typeof d.presentation?.text!=="string"||d.presentation.text.length>16000)throw Error("Unexpected lab projection");
   // The text remains untrusted synthetic teaching content, not assessment.
   return {status:"ok",sequence:d.sequence,anchor:d.anchor.lessonId,objective:d.anchor.objective,text:d.presentation.text,authority:"synthetic-practice-only"};
  }catch{blocked=true;return {status:"uncertain",completion:"unknown"};}finally{busy=false;}
 }
 return Object.freeze({state,practice(skill){if(!Object.hasOwn(REQUESTS,skill))throw Error("Unknown lab objective");return dispatch(()=>port.send(REQUESTS[skill]));},returnToAnchor(){return dispatch(()=>port.returnToAnchor());}});
}
module.exports={createExamLabBridge};
