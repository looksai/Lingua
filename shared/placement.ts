import {z} from "zod";

// Three optional writing samples to start an evidence-led, revisable plan.
// They do NOT assess comprehension of spoken English, oral fluency or CEFR.
export const PLACEMENT_TASKS=[
  {id:"introduce-v1",prompt:"Write in English: introduce yourself in 1–3 sentences. If you cannot, write 'I don't know yet'.",domain:"writing" as const},
  {id:"daily-work-v1",prompt:"Write in English: describe one typical day at your job or at home. You can use short sentences.",domain:"writing" as const},
  {id:"solve-problem-v1",prompt:"Write in English: describe a problem you solved or would like to solve, and what you would do next.",domain:"writing" as const},
] as const;
export const placementTaskId=z.enum(["introduce-v1","daily-work-v1","solve-problem-v1"]);
export const PLAN_VERSION=1;
export const learnerPlan=z.object({
  title:z.string().trim().min(8).max(100),
  observations:z.array(z.string().trim().min(6).max(220)).max(4),
  nextChecks:z.array(z.string().trim().min(6).max(150)).min(2).max(6),
  weeks:z.array(z.object({
    week:z.number().int().min(1).max(4),
    goal:z.string().trim().min(8).max(160),
    practice:z.string().trim().min(10).max(260),
    check:z.string().trim().min(8).max(180),
  })).length(4),
}).superRefine((plan,ctx)=>{
  if(plan.weeks.some((w,i)=>w.week!==i+1))ctx.addIssue({code:"custom",message:"weeks must be numbered 1–4"});
});
export type LearnerPlan=z.infer<typeof learnerPlan>;
export type PlacementTaskId=z.infer<typeof placementTaskId>;
export function starterPlan(context:string):LearnerPlan {
  const topic=context==="work"?"situações profissionais":"situações cotidianas";
  return {
    title:"Plano inicial de quatro semanas (sujeito a revisão)",
    observations:[],
    nextChecks:["Verificar compreensão de leitura com tarefa específica","Verificar escuta e fala com atividades independentes","Rever a produção escrita com tarefas progressivas"],
    weeks:[
      {week:1,goal:"Construir frases de apresentação",practice:"Pratique apresentações curtas em inglês em "+topic+".",check:"Produzir três frases sem consultar modelos."},
      {week:2,goal:"Descrever tarefas e rotinas",practice:"Pratique perguntas e respostas simples sobre seu dia.",check:"Escrever uma descrição curta e pedir correção."},
      {week:3,goal:"Entender instruções e perguntas",practice:"Leia instruções curtas, responda ao sentido e registre dúvidas.",check:"Responder a perguntas de compreensão de texto sem tradução pronta."},
      {week:4,goal:"Aplicar o idioma em situação real",practice:"Simule uma conversa de trabalho ou cotidiana por texto.",check:"Refazer uma situação semelhante e comparar sua autonomia."},
    ]
  };
}
