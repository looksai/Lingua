export const SPEAKING_VERSION="ielts-speaking-practice-v1-2026-11-28";
export type SpeakingPrompt={id:string;part:1|2|3;title:string;question:string;preparationSeconds:number;practiceSeconds:number;review:string[]};
export const SPEAKING_PROMPTS:SpeakingPrompt[]=[
 {id:"part1-work",part:1,title:"Work and routine",question:"What do you enjoy about your usual working day? Why?",preparationSeconds:0,practiceSeconds:45,review:["Did I answer the question directly?","Did I give a reason or a specific example?"]},
 {id:"part1-travel",part:1,title:"Getting around",question:"How do you usually travel around your town? Would you like to change that?",preparationSeconds:0,practiceSeconds:45,review:["Did I respond to both questions?","Did I connect my ideas naturally?"]},
 {id:"part2-skill",part:2,title:"A useful skill",question:"Describe a practical skill you learned. Say what it was, when you learned it, how you practised it, and explain why it is useful to you.",preparationSeconds:60,practiceSeconds:120,review:["Did I cover the main points?","Did I explain why the skill matters?","Did I organise the story in a clear sequence?"]},
 {id:"part2-place",part:2,title:"A memorable place",question:"Describe a place you visited that you would recommend. Say where it is, when you went, what you did there, and explain why you would recommend it.",preparationSeconds:60,practiceSeconds:120,review:["Did I describe a specific place?","Did I explain my recommendation?","Did I develop the answer beyond a list?"]},
 {id:"part3-learning",part:3,title:"Lifelong learning",question:"How should employers and individuals share responsibility for learning new skills? Why might this differ across professions?",preparationSeconds:0,practiceSeconds:90,review:["Did I give a reasoned opinion?","Did I compare different situations?"]},
 {id:"part3-cities",part:3,title:"Cities and transport",question:"What factors should governments consider when deciding how to improve urban transport? How might those decisions affect different groups?",preparationSeconds:0,practiceSeconds:90,review:["Did I consider different perspectives?","Did I support my ideas with examples?"]}
];
export const SPEAKING_CRITERIA=[
 {name:"Fluência e coerência",description:"Continuidade e organização da resposta."},
 {name:"Recursos lexicais",description:"Variedade e adequação de vocabulário."},
 {name:"Gramática",description:"Variedade e correção das estruturas."},
 {name:"Pronúncia",description:"Clareza e inteligibilidade da fala, a verificar ouvindo a gravação."}
] as const;
