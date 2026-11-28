// Proposed pilot retention, pending policy approval. UTC elapsed-time windows.
export const EXAM_RETENTION_DAYS=365;
export const EXAM_EXPIRED_ATTEMPT_GRACE_MS=86_400_000;
export function examRetentionCutoffs(now:number){
 if(!Number.isSafeInteger(now)||now<EXAM_RETENTION_DAYS*86_400_000||now>8640000000000000)throw Error("Invalid retention clock");
 return {history:now-EXAM_RETENTION_DAYS*86_400_000,attempt:now-EXAM_EXPIRED_ATTEMPT_GRACE_MS};
}
