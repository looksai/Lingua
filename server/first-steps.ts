/** Minimal first-contact curriculum owned by Lingua (not CSLE evidence or certification).
 * Answers remain server-side; client receives only question prompts and choices.
 */
export type FirstStepQuestion = {
  id: string;
  prompt: string;
  choices: [string, string, string];
  correct: number;
};

export const diagnosticQuestions: FirstStepQuestion[] = [
  { id: "d1", prompt: "Qual frase significa 'Eu sou estudante'?", choices: ["I is a student.", "I am a student.", "I are a student."], correct: 1 },
  { id: "d2", prompt: "Complete: She ___ ready.", choices: ["are", "am", "is"], correct: 2 },
  { id: "d3", prompt: "Complete: They ___ at work.", choices: ["are", "is", "am"], correct: 0 },
  { id: "d4", prompt: "The door is open. O que a frase informa?", choices: ["A porta está aberta.", "A porta está fechada.", "A porta é pesada."], correct: 0 },
  { id: "d5", prompt: "Qual é uma pergunta gramaticalmente correta?", choices: ["Is you ready?", "Are you ready?", "Am you ready?"], correct: 1 },
  { id: "d6", prompt: "Complete: I ___ not late.", choices: ["am", "is", "are"], correct: 0 },
];

export type FirstStepLesson = {
  key: "pronouns" | "to-be" | "questions";
  title: string;
  objective: string;
  explanation: string;
  examples: { en: string; pt: string }[];
  questions: FirstStepQuestion[];
};

export const foundationLessons: FirstStepLesson[] = [
  {
    key: "pronouns",
    title: "1 · Pronomes pessoais",
    objective: "Identificar quem fala e de quem estamos falando.",
    explanation: "I = eu; you = você; he = ele; she = ela; we = nós; they = eles/elas. Não precisa decorar tudo de uma vez: observe os exemplos.",
    examples: [
      { en: "I work here.", pt: "Eu trabalho aqui." },
      { en: "She works here.", pt: "Ela trabalha aqui." },
      { en: "We learn together.", pt: "Nós aprendemos juntos." },
    ],
    questions: [
      { id: "p1", prompt: "O pronome 'I' corresponde a:", choices: ["Eu", "Você", "Nós"], correct: 0 },
      { id: "p2", prompt: "O pronome 'we' corresponde a:", choices: ["Ela", "Nós", "Eles"], correct: 1 },
      { id: "p3", prompt: "Qual pronome substitui 'Maria'?", choices: ["He", "She", "We"], correct: 1 },
    ],
  },
  {
    key: "to-be",
    title: "2 · Am, is e are",
    objective: "Formar frases simples sobre pessoas e situações.",
    explanation: "Use am com I, is com he/she/it e are com you/we/they. Em português, o sentido pode ser ser ou estar.",
    examples: [
      { en: "I am ready.", pt: "Eu estou pronto." },
      { en: "The engine is cold.", pt: "O motor está frio." },
      { en: "We are students.", pt: "Nós somos estudantes." },
    ],
    questions: [
      { id: "t1", prompt: "Complete: I ___ ready.", choices: ["is", "am", "are"], correct: 1 },
      { id: "t2", prompt: "Complete: She ___ here.", choices: ["is", "are", "am"], correct: 0 },
      { id: "t3", prompt: "Complete: They ___ students.", choices: ["is", "am", "are"], correct: 2 },
    ],
  },
  {
    key: "questions",
    title: "3 · Perguntas e negativas",
    objective: "Perguntar e negar com o verbo to be.",
    explanation: "Para perguntar, coloque am/is/are antes do sujeito: Are you ready? Para negar, use not: I am not late.",
    examples: [
      { en: "Are you ready?", pt: "Você está pronto?" },
      { en: "She is not tired.", pt: "Ela não está cansada." },
      { en: "Is the door open?", pt: "A porta está aberta?" },
    ],
    questions: [
      { id: "q1", prompt: "Qual é a pergunta correta?", choices: ["You are ready?", "Are you ready?", "Am you ready?"], correct: 1 },
      { id: "q2", prompt: "Complete: He is ___ ready.", choices: ["not", "no", "are"], correct: 0 },
      { id: "q3", prompt: "Qual frase pergunta se a porta está aberta?", choices: ["Does the door open?", "The door is open.", "Is the door open?"], correct: 2 },
    ],
  },
];

export function publicQuestions(questions: FirstStepQuestion[]) {
  return questions.map(({ id, prompt, choices }) => ({ id, prompt, choices }));
}
export function gradeQuestions(questions: FirstStepQuestion[], answers: number[]) {
  if (questions.length !== answers.length) throw new Error("Unexpected assessment length");
  return questions.reduce((score, question, index) => score + Number(answers[index] === question.correct), 0);
}
