import {describe,expect,it} from "vitest";
import {createExamEngine,examAccess} from "./exam-engine";
import {trialGatedPath} from "./academy-trial";
describe("Exam pilot",()=>{
 it("denies by default and accepts only explicit known pilot plans",()=>{
  expect(examAccess("a@example.org",{})).toBeNull();
  const env={LINGUA_EXAM_PILOT_ENABLED:"true",LINGUA_EXAM_PILOT_ACCOUNTS:'{"a@example.org":"lingua","b@example.org":"community","c@example.org":"admin"}'};
  expect(examAccess(" A@example.org ",env)).toBe("lingua");
  expect(examAccess("b@example.org",env)).toBe("community");
  expect(examAccess("c@example.org",env)).toBeNull();
  expect(examAccess("d@example.org",env)).toBeNull();
  expect(examAccess("a@example.org",{...env,LINGUA_EXAM_PILOT_ACCOUNTS:"broken"})).toBeNull();
  expect(trialGatedPath("exams.start")).toBe(true);
 });
 it("keeps answer key server-side and differentiates Academic and General",()=>{
  const engine=createExamEngine(()=>1000);
  const a=engine.start(1,"ielts-academic","practice"),b=engine.start(2,"ielts-general","timed");
  expect(a.exercise.id).not.toBe(b.exercise.id);
  expect(a.exercise.questions).toHaveLength(4);
  expect(a.exercise.questions.every(q=>!Object.hasOwn(q,"expected")&&!Object.hasOwn(q,"explanation"))).toBe(true);
  expect(a.deadline-b.deadline).toBe(25*60*1000);
 });
 it("checks owner, validates alternatives, scores deterministically and replays result",()=>{
  const engine=createExamEngine(()=>1000);
  const a=engine.start(1,"ielts-academic","practice");
  expect(()=>engine.submit(2,a.id,{})).toThrow("Atividade indisponível");
  expect(()=>engine.submit(1,a.id,{unknown:"True"})).toThrow("Resposta inválida");
  expect(()=>engine.submit(1,a.id,{a1:"invented"})).toThrow("Alternativa inválida");
  const result=engine.submit(1,a.id,{a1:"True",a2:"False",a3:"Not given",a4:"To compare different seasons"});
  expect(result.correct).toBe(4);expect(result.total).toBe(4);
  expect(engine.submit(1,a.id,{})).toEqual(result);
 });
 it("rejects expired submissions and replaces old attempts",()=>{
  let now=1000;const engine=createExamEngine(()=>now);
  const a=engine.start(1,"ielts-general","timed");now=a.deadline;
  expect(()=>engine.submit(1,a.id,{})).toThrow("O tempo terminou");
  const b=engine.start(1,"ielts-general","practice");
  expect(()=>engine.submit(1,a.id,{})).toThrow("Atividade indisponível");
  expect(engine.submit(1,b.id,{g1:"False",g2:"True"}).correct).toBe(2);
 });
});
