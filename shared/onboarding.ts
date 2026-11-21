/**
 * First-access screening: small, transparently provisional samples.
 * NOT a language placement test or evidence of CEFR proficiency.
 * The first release intentionally supports pt-BR UI, PT help and EN target.
 */
export const firstAccessTasks = [
  {
    id: "introduce-yourself-v1",
    skill: "writing" as const,
    message: "Imagine que nos conhecemos hoje. Como você se apresentaria em inglês? Pode escrever só uma frase.",
    purpose: "Produção escrita livre: apresentação",
  },
  {
    id: "read-the-plan-v1",
    skill: "reading" as const,
    message: "Leia: 'Maya is visiting a new city on Friday.' Em português ou inglês, conte o que Maya fará e quando.",
    purpose: "Compreensão de informação explícita",
  },
  {
    id: "order-water-v1",
    skill: "writing" as const,
    message: "Você está em um café. Escreva em inglês como pediria um copo de água. Pode tentar mesmo sem ter certeza.",
    purpose: "Produção escrita contextual",
  },
  {
    id: "read-the-reason-v1",
    skill: "reading" as const,
    message: "Leia: 'Sam missed the bus because he woke up late.' Por que Sam perdeu o ônibus? Responda com suas palavras.",
    purpose: "Compreensão de causa",
  },
  {
    id: "ask-about-tomorrow-v1",
    skill: "writing" as const,
    message: "Pergunte em inglês para um amigo o que ele pretende fazer amanhã. Escreva como conseguir.",
    purpose: "Produção de pergunta",
  },
] as const;

export type FirstAccessTaskId = (typeof firstAccessTasks)[number]["id"];
export const supportedFirstAccessLanguages = {
  interfaceLocale: "pt-BR",
  nativeLanguage: "pt",
  targetLanguage: "en",
} as const;

export const tutorPersonaLabels = {
  welcoming: "Paciente e encorajador",
  direct: "Direto e focado",
  curious: "Curioso e descontraído",
  neutral: "Neutro e claro",
} as const;
export type TutorPersona = keyof typeof tutorPersonaLabels;

export const interestLabels = {
  curiosity: "Só quero experimentar",
  travel: "Viagens e conversas",
  work: "Trabalho e estudos",
  technology: "Tecnologia",
  everyday: "Dia a dia",
} as const;
export type LearnerInterest = keyof typeof interestLabels;

export function provisionalPath(interest: LearnerInterest) {
  const contexts: Record<LearnerInterest, string> = {
    curiosity: "situações reais e temas que despertem sua curiosidade",
    travel: "viagens e encontros com outras pessoas",
    work: "comunicação profissional",
    technology: "tecnologia e cotidiano digital",
    everyday: "situações do dia a dia",
  };
  return {
    title: "Começar por apresentações e perguntas do cotidiano",
    objective: "Praticar mensagens curtas, compreensão e perguntas simples em inglês.",
    context: contexts[interest],
    reason: "Este é um ponto de partida exploratório; suas respostas ainda não comprovam um nível.",
    limits: "Escuta e fala ainda não foram avaliadas. Uma conversa breve por texto não certifica proficiência.",
  };
}
