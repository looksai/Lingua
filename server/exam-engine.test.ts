import {describe,expect,it} from "vitest";
import {createExamEngine,examAccess,examExercises} from "./exam-engine";
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

describe("Expanded original content",()=>{
 it("lists three distinct reading sets per variant and common listening sets without answers",()=>{
  const academic=examExercises("ielts-academic","reading"),general=examExercises("ielts-general","reading");
  expect(academic).toHaveLength(3);expect(general).toHaveLength(3);
  expect(new Set([...academic,...general].map(x=>x.id)).size).toBe(6);
  expect(examExercises("ielts-academic","listening")).toEqual(examExercises("ielts-general","listening"));
  expect(examExercises("ielts-academic","listening")).toHaveLength(2);
  expect(academic.every(x=>Object.keys(x).length===2)).toBe(true);
 });
 it("grades selected content rather than default and rejects cross-variant selection",()=>{
  const engine=createExamEngine(()=>1000);
  expect(()=>engine.start(1,"ielts-academic","practice","reading","staff-training-02")).toThrow("Atividade incompatível");
  const a=engine.start(1,"ielts-academic","practice","reading","library-energy-02");
  expect(a.exercise.id).toBe("library-energy-02");
  expect(engine.submit(1,a.id,{a21:"True",a22:"False",a23:"Not given",a24:"Lights sometimes switched off while readers were still"}).correct).toBe(4);
 });
 it("listening is explicitly practice only and grades the matching script",()=>{
  const engine=createExamEngine(()=>1000);
  expect(()=>engine.start(1,"ielts-general","timed","listening")).toThrow("Listening cronometrado");
  const a=engine.start(1,"ielts-general","practice","listening","listening-appointment-01");
  expect(a.exercise.skill).toBe("listening");
  expect(engine.submit(1,a.id,{l11:"Saturday",l12:"9:30",l13:"A notebook",l14:"£12"}).correct).toBe(4);
 });
});

describe("Extended Reading mock",()=>{
 it.each(["ielts-academic","ielts-general"] as const)("uses distinct original sections and no answers in %s",variant=>{
  const e=createExamEngine(()=>1000);
  const a=e.start(1,variant,"timed","reading","reading-mock-v1");
  expect(a.deadline).toBe(1000+15*60*1000);
  expect(a.version).toBe("ielts-reading-mock-v1-2026-11-28");
  expect(a.exercise.sections).toHaveLength(3);
  expect(a.exercise.questions).toHaveLength(12);
  expect(a.exercise.sections!.flatMap(s=>s.questionIds)).toEqual(a.exercise.questions.map(q=>q.id));
  expect(new Set(a.exercise.questions.map(q=>q.id)).size).toBe(12);
  expect(a.exercise.questions.every(q=>!Object.hasOwn(q,"expected")&&!Object.hasOwn(q,"explanation"))).toBe(true);
  expect(()=>e.submit(2,a.id,{})).toThrow("Atividade indisponível");
  const result=e.submit(1,a.id,{});
  expect(result.total).toBe(12);expect(result.correct).toBe(0);
  expect(e.submit(1,a.id,{})).toEqual(result);
 });
 it("rejects practice and enforces deadline",()=>{
  let now=1000;const e=createExamEngine(()=>now);
  expect(()=>e.start(1,"ielts-academic","practice","reading","reading-mock-v1")).toThrow("Atividade incompatível");
  const a=e.start(1,"ielts-academic","timed","reading","reading-mock-v1");now=a.deadline;
  expect(()=>e.submit(1,a.id,{})).toThrow("O tempo terminou");
 });
});
