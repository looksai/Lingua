/**
 * Naruto / Lingua — curriculum microcompetencies v0.1, ORIGINAL teaching
 * content only. No student record, LLM, SRS, CSLE or database imports.
 *
 * A closed-answer match in a single task is *not* learning evidence,
 * delayed retention, reliable transfer, CEFR or mastery. The Lingua curriculum
 * authority must approve/version this repertoire before any real rollout.
 */
export type CompetencyDomain = "greeting" | "courtesy" | "identity" | "work" | "conversation";
export type CatalogStrategy =
  | "translated_chunk" | "contrastive_example" | "contextual_example"
  | "guided_practice" | "dialogue" | "audio_if_consented";
export type TaskMode = "closed_meaning" | "closed_expression" | "open_transfer";
export type AssessorMode = "trusted_closed_rule" | "requires_review";
export type MicroCompetency = Readonly<{
  id: string;
  version: 1;
  domain: CompetencyDomain;
  titlePt: string;
  objectivePt: string;
  prerequisites: readonly string[];
  explanationPt: string;
  modelEnglish: string;
  modelPortuguese: string;
  strategies: readonly CatalogStrategy[];
  taskIds: readonly string[];
  // When true, the text is ABOUT A FICTIONAL CHARACTER, NOT THE STUDENT.
  fictionalPersona: boolean;
}>;
export type MicroTask = Readonly<{
  id: string;
  version: 1;
  competencyId: string;
  mode: TaskMode;
  assessor: AssessorMode;
  promptPt: string;
  contextId: string;
  answerEnglish: string;
  acceptedAnswers: readonly string[];
  // Rubric text is policy data; LLM interpretation cannot silently turn it
  // into an automatic grade. An open task always requires external review.
  rubricPt: string;
  assistance: "model" | "hint" | "none";
}>;

const catalog: MicroCompetency[] = [
  {
    id: "greeting.hello", version: 1, domain: "greeting",
    titlePt: "Cumprimento básico: Hello",
    objectivePt: "Reconhecer e produzir a palavra Hello em um cumprimento.",
    prerequisites: [], explanationPt: "Hello pode significar Olá.",
    modelEnglish: "Hello", modelPortuguese: "Olá",
    strategies: ["translated_chunk","guided_practice","audio_if_consented"],
    taskIds: ["hello.meaning","hello.expression","hello.transfer"],
    fictionalPersona: false,
  },
  {
    id: "greeting.good-morning", version: 1, domain: "greeting",
    titlePt: "Cumprimentar pela manhã",
    objectivePt: "Reconhecer e produzir Good morning no contexto da manhã.",
    prerequisites: ["greeting.hello"],
    explanationPt: "Good morning corresponde a Bom dia em um cumprimento pela manhã.",
    modelEnglish: "Good morning", modelPortuguese: "Bom dia",
    strategies: ["translated_chunk","contextual_example","guided_practice"],
    taskIds: ["morning.meaning","morning.expression","morning.transfer"],
    fictionalPersona: false,
  },
  {
    id: "greeting.goodbye", version: 1, domain: "greeting",
    titlePt: "Encerrar uma conversa",
    objectivePt: "Distinguir cumprimentos de despedidas e produzir Goodbye.",
    prerequisites: ["greeting.hello"],
    explanationPt: "Goodbye pode ser usado para se despedir.",
    modelEnglish: "Goodbye", modelPortuguese: "Tchau",
    strategies: ["translated_chunk","contrastive_example","dialogue"],
    taskIds: ["goodbye.meaning","goodbye.expression","goodbye.transfer"],
    fictionalPersona: false,
  },
  {
    id: "courtesy.please", version: 1, domain: "courtesy",
    titlePt: "Expressar cortesia",
    objectivePt: "Entender o sentido de Please e usá-lo em um pedido.",
    prerequisites: ["greeting.hello"],
    explanationPt: "Please é usado em pedidos como Por favor.",
    modelEnglish: "Please", modelPortuguese: "Por favor",
    strategies: ["translated_chunk","contextual_example","dialogue"],
    taskIds: ["please.meaning","please.expression","please.transfer"],
    fictionalPersona: false,
  },
  {
    id: "courtesy.thank-you", version: 1, domain: "courtesy",
    titlePt: "Agradecer",
    objectivePt: "Reconhecer e produzir Thank you em uma situação de agradecimento.",
    prerequisites: ["courtesy.please"],
    explanationPt: "Thank you é uma forma de dizer Obrigado ou Obrigada.",
    modelEnglish: "Thank you", modelPortuguese: "Obrigado / Obrigada",
    strategies: ["translated_chunk","guided_practice","dialogue"],
    taskIds: ["thanks.meaning","thanks.expression","thanks.transfer"],
    fictionalPersona: false,
  },
  {
    id: "identity.my-name", version: 1, domain: "identity",
    titlePt: "Apresentar um nome em uma frase",
    objectivePt: "Compreender e usar a estrutura My name is ... com um nome fornecido.",
    prerequisites: ["greeting.hello"],
    explanationPt: "My name is ... é uma forma de informar um nome. Alex é fictício.",
    modelEnglish: "My name is Alex", modelPortuguese: "Meu nome é Alex",
    strategies: ["translated_chunk","contextual_example","guided_practice"],
    taskIds: ["name.meaning","name.expression","name.transfer"],
    fictionalPersona: true,
  },
  {
    id: "work.welder-example", version: 1, domain: "work",
    titlePt: "Falar de uma profissão em exemplo fictício",
    objectivePt: "Compreender I am a welder sem afirmar que o aluno é soldador.",
    prerequisites: ["identity.my-name"],
    explanationPt: "I am a welder significa Sou soldador/soldadora. É um exemplo de personagem, não biografia do aluno.",
    modelEnglish: "I am a welder", modelPortuguese: "Sou soldador / Sou soldadora",
    strategies: ["translated_chunk","contrastive_example","contextual_example"],
    taskIds: ["welder.meaning","welder.expression","welder.transfer"],
    fictionalPersona: true,
  },
  {
    id: "conversation.what-do-you-do", version: 1, domain: "conversation",
    titlePt: "Perguntar sobre a ocupação de alguém",
    objectivePt: "Compreender What do you do? como pergunta sobre trabalho em contexto adequado.",
    prerequisites: ["work.welder-example"],
    explanationPt: "What do you do? pode perguntar qual é a profissão ou ocupação da pessoa.",
    modelEnglish: "What do you do?", modelPortuguese: "Com o que você trabalha?",
    strategies: ["translated_chunk","contextual_example","dialogue"],
    taskIds: ["occupation.meaning","occupation.expression","occupation.transfer"],
    fictionalPersona: true,
  },
] as const;
const tasks: MicroTask[] = [
  {id:"hello.meaning",version:1,competencyId:"greeting.hello",mode:"closed_meaning",
   assessor:"trusted_closed_rule",promptPt:"Qual o significado de Hello?",contextId:"hello.word.meaning",
   answerEnglish:"Hello",acceptedAnswers:["Olá","Oi"],rubricPt:"Correspondência lexical explícita, sem avaliar pronúncia.",assistance:"model"},
  {id:"hello.expression",version:1,competencyId:"greeting.hello",mode:"closed_expression",
   assessor:"trusted_closed_rule",promptPt:"Como você escreveria Olá em inglês?",contextId:"hello.word.expression",
   answerEnglish:"Hello",acceptedAnswers:["Hello"],rubricPt:"Uma resposta escrita curta à palavra ensaiada; não comprova retenção.",assistance:"model"},
  {id:"hello.transfer",version:1,competencyId:"greeting.hello",mode:"open_transfer",
   assessor:"requires_review",promptPt:"Imagine que você conhece alguém em uma estação. Como iniciaria uma conversa curta em inglês?",contextId:"hello.station.new",
   answerEnglish:"Hello",acceptedAnswers:[],rubricPt:"Avaliar adequação ao contexto e autonomia, não somente a palavra isolada.",assistance:"none"},

  {id:"morning.meaning",version:1,competencyId:"greeting.good-morning",mode:"closed_meaning",
   assessor:"trusted_closed_rule",promptPt:"Em uma saudação, o que significa Good morning?",contextId:"morning.word.meaning",
   answerEnglish:"Good morning",acceptedAnswers:["Bom dia"],rubricPt:"Compreensão da expressão no contexto matinal.",assistance:"model"},
  {id:"morning.expression",version:1,competencyId:"greeting.good-morning",mode:"closed_expression",
   assessor:"trusted_closed_rule",promptPt:"Como escreveria Bom dia em inglês ao cumprimentar alguém?",contextId:"morning.word.expression",
   answerEnglish:"Good morning",acceptedAnswers:["Good morning"],rubricPt:"Reconhecimento de expressão fechada; sem afirmar produção independente.",assistance:"model"},
  {id:"morning.transfer",version:1,competencyId:"greeting.good-morning",mode:"open_transfer",
   assessor:"requires_review",promptPt:"Você encontra um colega de manhã cedo. Faça uma saudação apropriada em inglês.",contextId:"morning.work.new",
   answerEnglish:"Good morning",acceptedAnswers:[],rubricPt:"Avaliar adequação contextual, não só coincidência com gabarito.",assistance:"none"},

  {id:"goodbye.meaning",version:1,competencyId:"greeting.goodbye",mode:"closed_meaning",
   assessor:"trusted_closed_rule",promptPt:"O que Goodbye significa numa despedida?",contextId:"goodbye.word.meaning",
   answerEnglish:"Goodbye",acceptedAnswers:["Tchau","Adeus"],rubricPt:"Reconhecimento lexical da despedida.",assistance:"model"},
  {id:"goodbye.expression",version:1,competencyId:"greeting.goodbye",mode:"closed_expression",
   assessor:"trusted_closed_rule",promptPt:"Qual expressão em inglês você usaria para dizer Adeus?",contextId:"goodbye.word.expression",
   answerEnglish:"Goodbye",acceptedAnswers:["Goodbye"],rubricPt:"Expressão fechada, não avaliação completa de diálogo.",assistance:"model"},
  {id:"goodbye.transfer",version:1,competencyId:"greeting.goodbye",mode:"open_transfer",
   assessor:"requires_review",promptPt:"Uma conversa acabou. Termine o diálogo educadamente em inglês.",contextId:"goodbye.dialogue.new",
   answerEnglish:"Goodbye",acceptedAnswers:[],rubricPt:"Avaliar intenção, adequação e resposta contextual.",assistance:"none"},

  {id:"please.meaning",version:1,competencyId:"courtesy.please",mode:"closed_meaning",
   assessor:"trusted_closed_rule",promptPt:"Num pedido, o que significa Please?",contextId:"please.word.meaning",
   answerEnglish:"Please",acceptedAnswers:["Por favor"],rubricPt:"Significado de cortesia em contexto de pedido.",assistance:"model"},
  {id:"please.expression",version:1,competencyId:"courtesy.please",mode:"closed_expression",
   assessor:"trusted_closed_rule",promptPt:"Como você escreveria Por favor em inglês?",contextId:"please.word.expression",
   answerEnglish:"Please",acceptedAnswers:["Please"],rubricPt:"Correspondência simples, sem simular uma interação complexa.",assistance:"model"},
  {id:"please.transfer",version:1,competencyId:"courtesy.please",mode:"open_transfer",
   assessor:"requires_review",promptPt:"Peça educadamente uma informação a um recepcionista, em inglês.",contextId:"please.reception.new",
   answerEnglish:"Please",acceptedAnswers:[],rubricPt:"Examinar adequação de um pedido original, sem gabarito exclusivo.",assistance:"none"},

  {id:"thanks.meaning",version:1,competencyId:"courtesy.thank-you",mode:"closed_meaning",
   assessor:"trusted_closed_rule",promptPt:"Qual o significado de Thank you?",contextId:"thanks.word.meaning",
   answerEnglish:"Thank you",acceptedAnswers:["Obrigado","Obrigada"],rubricPt:"Agradecimento básico.",assistance:"model"},
  {id:"thanks.expression",version:1,competencyId:"courtesy.thank-you",mode:"closed_expression",
   assessor:"trusted_closed_rule",promptPt:"Como você escreveria Obrigado em inglês?",contextId:"thanks.word.expression",
   answerEnglish:"Thank you",acceptedAnswers:["Thank you"],rubricPt:"Gabarito de frase curta.",assistance:"model"},
  {id:"thanks.transfer",version:1,competencyId:"courtesy.thank-you",mode:"open_transfer",
   assessor:"requires_review",promptPt:"Um colega ajudou você numa tarefa. Agradeça em inglês.",contextId:"thanks.colleague.new",
   answerEnglish:"Thank you",acceptedAnswers:[],rubricPt:"Avaliar naturalidade e função comunicativa em novo contexto.",assistance:"none"},

  {id:"name.meaning",version:1,competencyId:"identity.my-name",mode:"closed_meaning",
   assessor:"trusted_closed_rule",promptPt:"Na frase My name is Alex, que informação é apresentada?",contextId:"name.fictional.meaning",
   answerEnglish:"My name is Alex",acceptedAnswers:["Meu nome é Alex","O nome é Alex"],rubricPt:"É um nome fictício; não assumir que o aluno se chama Alex.",assistance:"model"},
  {id:"name.expression",version:1,competencyId:"identity.my-name",mode:"closed_expression",
   assessor:"trusted_closed_rule",promptPt:"Escreva Meu nome é Alex em inglês (Alex é um personagem).",contextId:"name.fictional.expression",
   answerEnglish:"My name is Alex",acceptedAnswers:["My name is Alex"],rubricPt:"Produção de estrutura com nome fictício, não evidência biográfica.",assistance:"model"},
  {id:"name.transfer",version:1,competencyId:"identity.my-name",mode:"open_transfer",
   assessor:"requires_review",promptPt:"Num encontro fictício, apresente uma personagem chamada Jo em inglês.",contextId:"name.jo.new",
   answerEnglish:"My name is Jo",acceptedAnswers:[],rubricPt:"Avaliar transferência de estrutura para um nome diferente, sem usar dados do aluno.",assistance:"none"},

  {id:"welder.meaning",version:1,competencyId:"work.welder-example",mode:"closed_meaning",
   assessor:"trusted_closed_rule",promptPt:"No exemplo fictício, o que significa I am a welder?",contextId:"welder.fictional.meaning",
   answerEnglish:"I am a welder",acceptedAnswers:["Sou soldador","Sou soldadora","Eu sou soldador","Eu sou soldadora"],rubricPt:"Tradução de personagem fictício; não prova profissão do aluno.",assistance:"model"},
  {id:"welder.expression",version:1,competencyId:"work.welder-example",mode:"closed_expression",
   assessor:"trusted_closed_rule",promptPt:"Como um personagem diria Sou soldador em inglês?",contextId:"welder.fictional.expression",
   answerEnglish:"I am a welder",acceptedAnswers:["I am a welder"],rubricPt:"Exercício de frase-modelo fictícia, não currículo oficial.",assistance:"model"},
  {id:"welder.transfer",version:1,competencyId:"work.welder-example",mode:"open_transfer",
   assessor:"requires_review",promptPt:"Numa entrevista de personagem fictício, responda a uma pergunta sobre profissão em inglês.",contextId:"welder.interview.new",
   answerEnglish:"I am a welder",acceptedAnswers:[],rubricPt:"Exigir resposta apropriada à pergunta, não inventar certificação nem anos de trabalho.",assistance:"none"},

  {id:"occupation.meaning",version:1,competencyId:"conversation.what-do-you-do",mode:"closed_meaning",
   assessor:"trusted_closed_rule",promptPt:"Numa entrevista, o que a pergunta What do you do? quer saber?",contextId:"occupation.question.meaning",
   answerEnglish:"What do you do?",acceptedAnswers:["Com o que você trabalha","Qual é sua profissão","O que você faz"],rubricPt:"Somente sentido ocupacional neste contexto; a expressão pode ter outros usos.",assistance:"model"},
  {id:"occupation.expression",version:1,competencyId:"conversation.what-do-you-do",mode:"closed_expression",
   assessor:"trusted_closed_rule",promptPt:"Como perguntar Com o que você trabalha? em inglês?",contextId:"occupation.question.expression",
   answerEnglish:"What do you do?",acceptedAnswers:["What do you do"],rubricPt:"Gabarito específico, não implica compreensão em todas as situações.",assistance:"model"},
  {id:"occupation.transfer",version:1,competencyId:"conversation.what-do-you-do",mode:"open_transfer",
   assessor:"requires_review",promptPt:"Simule uma conversa curta com um colega fictício e pergunte sua ocupação em inglês.",contextId:"occupation.colleague.new",
   answerEnglish:"What do you do?",acceptedAnswers:[],rubricPt:"Avaliar contexto, espontaneidade, apoio e pertinência, sem dar nível CEFR.",assistance:"none"},
] as const;

export const MICROCOMPETENCIES: readonly MicroCompetency[] = Object.freeze(catalog);
export const MICRO_TASKS: readonly MicroTask[] = Object.freeze(tasks);
const idPattern = /^[a-z][a-z0-9.-]{2,89}$/;
const normalize = (input: string) => input.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR")
  .replace(/[.!?,;:]+/g, "")
  .replace(/\s+/g, " ").trim();

export type CatalogueError = Readonly<{code: string; id: string}>;
/** Validates graph, task ownership, schema tags and closed-answer uniqueness. */
export function validateMicrocatalogue(
  competencies: readonly MicroCompetency[] = MICROCOMPETENCIES,
  entries: readonly MicroTask[] = MICRO_TASKS,
): readonly CatalogueError[] {
  const failures: CatalogueError[] = [];
  const competenciesById = new Map(competencies.map(c => [c.id,c]));
  const tasksById = new Map(entries.map(t => [t.id,t]));
  if (competenciesById.size !== competencies.length) failures.push({code:"duplicate_competency",id:"catalog"});
  if (tasksById.size !== entries.length) failures.push({code:"duplicate_task",id:"catalog"});
  const active = new Set<string>(), resolved = new Set<string>();
  function visit(id:string) {
    if (active.has(id)) {failures.push({code:"prerequisite_cycle",id});return;}
    if (resolved.has(id)) return;
    const item=competenciesById.get(id);
    if (!item) {failures.push({code:"unknown_prerequisite",id});return;}
    active.add(id);
    for (const pre of item.prerequisites) visit(pre);
    active.delete(id);resolved.add(id);
  }
  for (const c of competencies) {
    if (!idPattern.test(c.id) || !c.titlePt.trim() || !c.objectivePt.trim() ||
        !c.explanationPt.trim() || !c.modelEnglish.trim() || !c.modelPortuguese.trim() ||
        !c.strategies.length || c.version !== 1)
      failures.push({code:"invalid_competency",id:c.id});
    if (new Set(c.taskIds).size !== c.taskIds.length) failures.push({code:"duplicate_task_reference",id:c.id});
    for (const id of c.taskIds) if (tasksById.get(id)?.competencyId !== c.id)
      failures.push({code:"missing_or_foreign_task",id});
    visit(c.id);
  }
  for (const t of entries) {
    if (!idPattern.test(t.id) || !competenciesById.has(t.competencyId) ||
        !competenciesById.get(t.competencyId)?.taskIds.includes(t.id) ||
        !t.promptPt.trim() || !t.rubricPt.trim() || !t.answerEnglish.trim() ||
        !t.contextId.trim() || t.version !== 1)
      failures.push({code:"invalid_task",id:t.id});
    if (t.mode === "open_transfer") {
      if (t.assessor !== "requires_review" || t.acceptedAnswers.length !== 0 || t.assistance !== "none")
        failures.push({code:"open_task_must_be_reviewed",id:t.id});
    } else if (t.assessor !== "trusted_closed_rule" || t.acceptedAnswers.length === 0 ||
      t.acceptedAnswers.some(a => !a.trim()) ||
      new Set(t.acceptedAnswers.map(normalize)).size !== t.acceptedAnswers.length)
      failures.push({code:"invalid_closed_answer",id:t.id});
  }
  return failures;
}
export function getMicrocompetency(id:string): MicroCompetency | null {
  return MICROCOMPETENCIES.find(c=>c.id===id) ?? null;
}
export function getMicrotask(id:string): MicroTask | null {
  return MICRO_TASKS.find(t=>t.id===id) ?? null;
}
/**
 * Administrative preview only: "eligible" does not equal "learned".
 * The caller must supply a verified set of prerequisite IDs and the
 * authenticated curriculum policy still governs the path.
 */
export function eligibleMicrocompetencies(prerequisitesSatisfied: ReadonlySet<string>): readonly MicroCompetency[] {
  return MICROCOMPETENCIES.filter(c => c.prerequisites.every(id => prerequisitesSatisfied.has(id)));
}
export type ClosedTaskCheck = Readonly<{
  outcome: "meets" | "not_yet" | "not_evaluable";
  assessor: "rule_candidate";
  reason: string;
}>;
export function evaluateClosedMicrotask(
  task: MicroTask,
  studentAnswer: string,
  modality: "typed" | "asr_text" = "typed",
): ClosedTaskCheck {
  const fail=(reason:string):ClosedTaskCheck=>({outcome:"not_evaluable",assessor:"rule_candidate",reason});
  // This is a *candidate* until task presentation, identity, rubric, consent,
  // timing, and assistance are verified by an orchestrator on the server.
  if(task.mode==="open_transfer")return fail("requires_contextual_review");
  if(task.assessor!=="trusted_closed_rule")return fail("not_closed_rule");
  if(modality==="asr_text")return fail("asr_cannot_certify_correctness");
  if(typeof studentAnswer!=="string" || studentAnswer.length>120)return fail("invalid_answer");
  // Preserve the raw question mark: normalization removes punctuation.
  // A learner question is a request for help, never an incorrect response.
  const isQuestion = studentAnswer.includes("?");
  const answer=normalize(studentAnswer);
  if(!answer||isQuestion||/^(?:nao sei|nao entendi|ajuda|repete|pode explicar|nao consigo)$/.test(answer))
    return fail("not_a_valid_attempt");
  if(!task.acceptedAnswers.every(x=>x.trim()))return fail("broken_task");
  if (task.acceptedAnswers.some(x=>normalize(x)===answer))
    return {outcome:"meets",assessor:"rule_candidate",reason:"closed_form_match_only"};
  // Reject only a CLEAR lexical distractor from another vetted task of the
  // same kind. Otherwise this could be a new question, alternate phrasing or
  // personal goal — it needs clarification, not a grade of "wrong".
  const knownDistractor = MICRO_TASKS.some(other =>
    other.mode===task.mode && other.id!==task.id &&
    other.acceptedAnswers.some(x=>normalize(x)===answer));
  return knownDistractor
    ? {outcome:"not_yet",assessor:"rule_candidate",reason:"known_lexical_distractor"}
    : {outcome:"not_evaluable",assessor:"rule_candidate",reason:"unrecognized_free_text"};
}
