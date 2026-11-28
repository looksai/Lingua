import type { IeltsVariant } from "./exam-contract";
export const WRITING_VERSION="ielts-writing-v1-2026-11-28";
export const WRITING_CRITERIA=[
 {id:"task",name:"Cumprimento da tarefa",description:"Atendimento ao enunciado, relevância, desenvolvimento e precisão."},
 {id:"coherence",name:"Coerência e coesão",description:"Organização lógica das ideias e conexão entre parágrafos."},
 {id:"lexical",name:"Recursos lexicais",description:"Variedade, precisão e adequação do vocabulário."},
 {id:"grammar",name:"Gramática",description:"Variedade e correção das estruturas gramaticais."}
] as const;
export type WritingCriterion=typeof WRITING_CRITERIA[number]["id"];
export type WritingTask={id:string;variant:IeltsVariant;kind:1|2;title:string;prompt:string;minimumWords:150|250;recommendedMinutes:20|40;table?:{caption:string;headers:string[];rows:string[][]};reviewQuestions:string[]};
export type WritingReview={version:string;taskId:string;wordCount:number;minimumWords:number;minimumMet:boolean;criteria:typeof WRITING_CRITERIA;reviewQuestions:string[];assessment:"self-review-only"};
export function countWritingWords(text:string):number{
 return text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)?.length??0;
}
