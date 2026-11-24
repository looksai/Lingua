import type { TutorHistory } from "./tutor";

/**
 * Conservative, ephemeral language hint: only the student's own words and
 * explicitly saved facts can establish that they need zero-English teaching.
 * Never infer a CEFR level or silently save a learning preference.
 */
const ZERO_ENGLISH =
  /(?:n[aã]o\s+(?:sei|entendo|falo|conhe[cç]o)\s+(?:(?:absolutamente|quase)\s+)?(?:(?:nada|muito|bem)\s+(?:de\s+)?)?(?:ingl[eê]s|english)|n[aã]o\s+sei\s+nada(?:\s+de\s+ingl[eê]s)?|(?:sou|estou|me\s+considero)\s+(?:um[a]?\s+)?iniciante(?:\s+absolut[oa])?|come[cç](?:ar|ando|o)?\s+(?:do|de)\s+zero|nunca\s+(?:estudei|aprendi)\s+ingl[eê]s|i\s+(?:don't|do\s+not)\s+(?:know|understand|speak)\s+english|prefiro\s+(?:que\s+voc[eê]\s+)?(?:as\s+)?explica[cç][oõ]es\s+em\s+portugu[eê]s)/iu;
const ENGLISH_ONLY = /(?:responda|fale|converse|explique)\s+(?:s[oó]\s+|somente\s+|apenas\s+)?em\s+ingl[eê]s|english\s+only/iu;

export function needsAbsoluteBeginnerSupport(
  history: readonly TutorHistory[], message: string, approvedFacts: readonly string[] = [],
): boolean {
  // Current direct language choice beats earlier context, but cannot save a memory.
  if (ENGLISH_ONLY.test(message)) return false;
  return [message, ...history.filter(x => x.role === "user").map(x => x.text), ...approvedFacts]
    .some(value => ZERO_ENGLISH.test(value));
}

const ENGLISH_WORDS = new Set([
  "great","you","your","are","can","say","ready","try","practice","start",
  "with","english","work","as","welder","i","am","have","years","do",
  "want","repeat","understand","here","this","the","a","let's","hello",
  "we","will","we're","good","job","how","what","about","would","like",
]);
const PORTUGUESE_WORDS = new Set([
  "você","voce","vamos","pode","quer","frase","inglês","ingles","significa",
  "como","trabalho","sou","estou","sei","entendo","agora","tudo","ótimo",
  "otimo","entendi","começar","comecar","repetir","português","portugues",
  "devagar","com","uma","que","não","nao","está","esta","isso","exemplo",
  "aqui","para","dizer","disse","aprender","palavra","bem","aos","poucos",
]);

export function isEnglishDominantReply(text: string): boolean {
  const words = text.toLocaleLowerCase("pt-BR").match(/[\p{L}']+/gu) ?? [];
  const en = words.filter(w => ENGLISH_WORDS.has(w)).length;
  const pt = words.filter(w => PORTUGUESE_WORDS.has(w)).length;
  const lead = /^(?:[\s*"'“”]+)?(?:great[!,.: ]|sure[!,.: ]|you\b|let's\b|ready\b|try\b|hello[!,.: ]|we\b|i\s+(?:am|work|have)\b)/iu.test(text);
  return (en >= 5 && en > pt * 1.5) || (lead && en >= 3 && pt <= 1);
}

function previouslyDisclosedWelder(
  history: readonly TutorHistory[], message: string, approvedFacts: readonly string[],
): boolean {
  return [message,...history.filter(x=>x.role==="user").map(x=>x.text),...approvedFacts]
    .some(t=>/(?:\bsou\s+(?:um\s+)?soldador\b|\btrabalho\s+(?:como|de)\s+soldador\b|\bi\s+(?:am|'m)\s+(?:a\s+)?welder\b)/iu.test(t));
}

export function enforceBeginnerPortuguese(
  tutorText: string, history: readonly TutorHistory[], message: string,
  approvedFacts: readonly string[] = [],
): { text: string; corrected: boolean } {
  if (!needsAbsoluteBeginnerSupport(history,message,approvedFacts) ||
      !isEnglishDominantReply(tutorText))
    return {text:tutorText,corrected:false};
  const welder=previouslyDisclosedWelder(history,message,approvedFacts);
  const asksAboutJob=/(?:com\s+o\s+que\s+(?:eu\s+)?trabalh|qual\s+(?:[eé]\s+)?(?:a\s+)?minha\s+profiss[aã]o)/iu.test(message);
  if (welder && asksAboutJob)
    return {text:"Você me contou que trabalha como soldador. Em inglês, **I am a welder** significa **Eu sou soldador**. Quer aprender essa frase bem devagar?",corrected:true};
  if (welder)
    return {text:"Entendi! Vamos com calma e em português. **I am a welder** significa **Eu sou soldador**. Quer praticar só essa frase, passo a passo?",corrected:true};
  return {text:"Entendi! Vamos começar do zero, com explicações em português. **Hello** significa **Olá**. Quer praticar só essa palavra antes de avançarmos?",corrected:true};
}
