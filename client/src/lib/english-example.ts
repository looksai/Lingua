import {speechText} from "./tutor-speech";
// The available Orpheus model speaks English only and accepts at most 200 characters.
// Do not silently send the entire bilingual/Portuguese response to an English TTS.
function looksEnglish(line:string):boolean {
  if(/[\u00c0-\u024f]/.test(line))return false;
  return /\b(i|my|we|you|your|the|this|that|have|has|am|are|is|work|working|welding|welder|want|can|would|please|hello|good|morning)\b/i.test(line)
    && line.trim().split(/\s+/).length>=3;
}
export function englishExcerpt(message:string):string|null {
  const text=speechText(message);
  const quotes=[...text.matchAll(/["“”]([^"“”]{8,200})["“”]/g)]
    .map(match=>match[1].trim());
  const candidate=quotes.find(looksEnglish) ?? (text.length<=200&&looksEnglish(text)?text:null);
  if(!candidate)return null;
  return candidate.slice(0,200);
}
