/**
 * Client-facing fictional CAL exercise metadata. The browser can report DOM
 * rendering, never prove human attention, retention, identity or proficiency.
 * This shape contains no learner answer, audio or personal memory.
 */
export type CatalogClientTask=Readonly<{
  sessionId:string;
  deliveryId:string;
  taskId:string;
  taskVersion:number;
  promptText:string;
}>;

/** Never split/free-display an unverified suffix. Fail closed on changed text. */
export function splitCatalogTaskText(replyText:string,task:CatalogClientTask):{
  explanation:string;taskText:string;
}|null {
  if(!task.promptText||!task.deliveryId||!task.sessionId)return null;
  if(replyText===task.promptText)return {explanation:"",taskText:task.promptText};
  const separator="\n\n"+task.promptText;
  return replyText.endsWith(separator)
    ? {explanation:replyText.slice(0,-separator.length),taskText:task.promptText}
    : null;
}
