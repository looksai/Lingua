import {countWritingWords,WRITING_CRITERIA,type WritingTask} from "./exam-writing-contract";
export const WRITING_SEQUENCE_VERSION="ielts-writing-sequence-v1";
export const WRITING_SEQUENCE_MS=60*60*1000;
export function writingSequence(tasks:readonly WritingTask[]){
 const first=tasks.find(t=>t.kind===1),second=tasks.find(t=>t.kind===2);
 return first&&second&&first.variant===second.variant?[first,second]:[];
}
export function reviewWritingSequence(tasks:readonly WritingTask[],drafts:Readonly<Record<string,string>>){
 return writingSequence(tasks).map(task=>{
  const text=drafts[task.id]??"",words=countWritingWords(text);
  return {taskId:task.id,title:task.title,kind:task.kind,words,minimumWords:task.minimumWords,minimumMet:words>=task.minimumWords,questions:task.reviewQuestions,criteria:WRITING_CRITERIA,assessment:"self-review-only" as const};
 });
}
