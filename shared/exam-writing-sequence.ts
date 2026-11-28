import {countWritingWords,WRITING_CRITERIA,type WritingTask} from "./exam-writing-contract";
export const WRITING_SEQUENCE_VERSION="ielts-writing-sequence-v1";
export const WRITING_SEQUENCE_MS=60*60*1000;
export function writingSequence(tasks:readonly WritingTask[],setId:NonNullable<WritingTask["setId"]>="set-1"){
 const matching=tasks.filter(t=>(t.setId??"set-1")===setId);
 const first=matching.find(t=>t.kind===1),second=matching.find(t=>t.kind===2);
 if(matching.length!==2||!first||!second||first.id===second.id)return [];
 return first&&second&&first.variant===second.variant?[first,second]:[];
}
export function reviewWritingSequence(tasks:readonly WritingTask[],drafts:Readonly<Record<string,string>>,setId:NonNullable<WritingTask["setId"]>="set-1"){
 return writingSequence(tasks,setId).map(task=>{
  const text=drafts[task.id]??"",words=countWritingWords(text);
  return {taskId:task.id,title:task.title,kind:task.kind,words,minimumWords:task.minimumWords,minimumMet:words>=task.minimumWords,questions:task.reviewQuestions,criteria:WRITING_CRITERIA,assessment:"self-review-only" as const};
 });
}
