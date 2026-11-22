import { createGroqTutor } from "./tutor-free-provider";
import { createOpenAITutor } from "./tutor-provider";
import { tutorMode } from "./tutor-budget";

// This is the only route from a tutor's explicit provider choice to an external API.
// In groq-gemini mode the OPENAI_API_KEY field is not inspected or passed to any adapter.
export function createSelectedTutor(mode:"groq"|"openai"|"off",env=process.env,request:typeof fetch=fetch) {
  if(mode==="groq" && tutorMode(env)==="groq")return createGroqTutor(env,request);
  if(mode==="openai" && tutorMode(env)==="openai")return createOpenAITutor(env,request);
  throw Error("tutor provider disabled");
}
