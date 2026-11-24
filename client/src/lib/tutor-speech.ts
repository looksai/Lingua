export type LocalVoice = Pick<SpeechSynthesisVoice,"voiceURI"|"name"|"lang"|"localService">;

// Unverified or remote browser voices can transmit speech text outside the app.
// Only explicitly local voices are offered in the no-credit experience.
export function availableLocalVoices(voices:readonly LocalVoice[]):LocalVoice[] {
  return voices.filter(voice=>voice.localService===true && Boolean(voice.voiceURI) && Boolean(voice.lang));
}
export function selectLocalVoice(voices:readonly LocalVoice[],preferredURI:string):LocalVoice|null{
  const eligible=availableLocalVoices(voices);
  return eligible.find(v=>v.voiceURI===preferredURI) ??
    eligible.find(v=>v.lang.toLowerCase()==="pt-br") ??
    eligible.find(v=>v.lang.toLowerCase().startsWith("pt")) ??
    eligible.find(v=>v.lang.toLowerCase()==="en-us") ??
    eligible[0] ?? null;
}
// English practice must never be spoken by a Portuguese-only local voice.
export function selectEnglishLocalVoice(voices:readonly LocalVoice[],preferredURI:string):LocalVoice|null {
  // Browser/OS voice tags are inconsistent: en-US, en_US and eng are encountered.
  // Match only explicit English language codes; never substitute pt-BR for English lessons.
  const normalize=(lang:string)=>lang.trim().toLowerCase().replace(/_/g,"-");
  const english=availableLocalVoices(voices).filter(v=>/^(?:en|eng)(?:-|$)/.test(normalize(v.lang)));
  return english.find(v=>v.voiceURI===preferredURI) ??
    english.find(v=>normalize(v.lang)==="en-us"||normalize(v.lang)==="eng-us") ??
    english[0] ?? null;
}
export function speechReady(voices:readonly LocalVoice[]):boolean{return availableLocalVoices(voices).length>0;}
export function speechText(input:string):string {
  // A TTS engine reads literal asterisks, links and formatting markers awkwardly.
  // The rendered transcript remains unchanged; only audio playback is simplified.
  return input
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g,"$1")
    .replace(/\*\*([^*]+)\*\*/g,"$1")
    .replace(/__([^_]+)__/g,"$1")
    .replace(/(^|\s)[*_#]+ ?/gm,"$1")
    .replace(/\s+/g," ")
    .trim()
    .slice(0,1200);
}
