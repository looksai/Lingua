import {localReply} from "../shared/tutor";
import {GROQ_RATE_LIMIT_MESSAGE,isGroqRateLimitError} from "./tutor-free-provider";

export function tutorFailureReply(error:unknown,message:string,voice:boolean){
  return {
    text:isGroqRateLimitError(error)?GROQ_RATE_LIMIT_MESSAGE:localReply(message),
    source:"local" as const,
    audioBase64:null,
    voiceStatus:voice?"unavailable" as const:"off" as const,
  };
}
