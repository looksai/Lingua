export const EXAM_CATALOG = [
 {id:"ielts-academic",name:"IELTS Academic",purpose:"Estudos superiores e registro profissional",status:"pilot",source:"https://ielts.org/take-a-test/test-types/ielts-academic-test"},
 {id:"ielts-general",name:"IELTS General Training",purpose:"Trabalho e imigração (conforme programa)",status:"pilot",source:"https://ielts.org/take-a-test/test-types/ielts-general-training-test"},
 {id:"toefl-ibt",name:"TOEFL iBT",purpose:"Admissão acadêmica",status:"planned"},
 {id:"celpip",name:"CELPIP",purpose:"Imigração canadense (conforme programa)",status:"planned"},
 {id:"pte-academic",name:"PTE Academic",purpose:"Estudos e imigração (conforme programa)",status:"planned"},
 {id:"pte-core",name:"PTE Core",purpose:"Imigração canadense (conforme programa)",status:"planned"},
 {id:"cambridge",name:"Cambridge English",purpose:"Certificações de inglês",status:"planned"},
 {id:"duolingo",name:"Duolingo English Test",purpose:"Admissão acadêmica",status:"planned"},
] as const;
export const IELTS_ADAPTER_VERSION="ielts-reading-listening-v2-2026-11-28";
export const IELTS_VARIANTS=["ielts-academic","ielts-general"] as const;
export type IeltsVariant=typeof IELTS_VARIANTS[number];
export const EXAM_SKILLS=["reading","listening"] as const;
export type ExamSkill=typeof EXAM_SKILLS[number];
export type ExamMode="practice"|"timed";
export const EXAM_MODES=["practice","timed"] as const;
export const EXAM_PILOT_DURATION_MS=5*60*1000;
export const EXAM_PRACTICE_DURATION_MS=30*60*1000;
export type ExamQuestion={id:string;prompt:string;options:readonly string[]};
export const READING_MOCK_ID="reading-mock-v1";
export const READING_MOCK_VERSION="ielts-reading-mock-v1-2026-11-28";
export const READING_MOCK_DURATION_MS=15*60*1000;
export type ExamReadingSection={title:string;passage:string;questionIds:string[]};
export type ExamExercise={id:string;title:string;passage:string;skill:ExamSkill;questions:ExamQuestion[];sections?:ExamReadingSection[]};
export type ExamAttempt={id:string;variant:IeltsVariant;mode:ExamMode;version:string;deadline:number;exercise:ExamExercise};
export type ExamResult={correct:number;total:number;mode:ExamMode;version:string;items:{id:string;correct:boolean;expected:string;explanation:string}[]};
