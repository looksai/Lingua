import {describe,it,expect,vi} from "vitest";
import {generateWritingFeedback,parseWritingFeedback,writingFeedbackEnabled} from "./exam-writing-feedback";
import {writingTasks} from "./exam-writing";
describe("Exam writing feedback",()=>{
 const sample={criterion:"grammar",excerpt:"People is learning.",observation:"O verbo não concorda com o sujeito.",suggestion:"Use: People are learning."};
 it("accepts only grounded structured qualitative feedback",()=>{
  expect(parseWritingFeedback(JSON.stringify(sample),"People is learning.")).toMatchObject({...sample,kind:"experimental-coaching"});
  expect(parseWritingFeedback(JSON.stringify(sample),"Different text.")).toBeNull();
  expect(parseWritingFeedback(JSON.stringify({...sample,band:8}),sample.excerpt)).toBeNull();
  expect(parseWritingFeedback(JSON.stringify({...sample,observation:"Sua banda é 8."}),sample.excerpt)).toBeNull();
  expect(parseWritingFeedback("not json",sample.excerpt)).toBeNull();
  expect(writingFeedbackEnabled({})).toBe(false);
  expect(writingFeedbackEnabled({LINGUA_EXAM_AI_FEEDBACK_ENABLED:"true"})).toBe(true);
 });
 it("sends original task and response as data without learner memory or history",async()=>{
  const reply=vi.fn(async()=>JSON.stringify(sample));
  const task=writingTasks("ielts-academic")[0]!;
  const feedback=await generateWritingFeedback({reply},{tutorName:"QA",tutorPersona:"neutral",interest:"work"},task,sample.excerpt);
  expect(feedback?.excerpt).toBe(sample.excerpt);
  const call=reply.mock.calls[0] as unknown as unknown[];
  expect(call[1]).toEqual([]);expect(call[3]).toEqual([]);
  expect(JSON.parse(call[2] as string).studentText).toBe(sample.excerpt);
  expect(call[4]).toContain("Não atribua nota");
 });
});
