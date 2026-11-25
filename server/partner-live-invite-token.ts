import {createHash,randomBytes} from "node:crypto";
// Store only the digest; the raw token is returned once to the authorized issuer.
export function digestLiveInviteToken(token:string):string|null {
  if(typeof token!=="string"||token.length!==43||!/^[A-Za-z0-9_-]+$/.test(token))return null;
  const bytes=Buffer.from(token,"base64url");
  if(bytes.length!==32||bytes.toString("base64url")!==token)return null;
  return createHash("sha256").update(bytes).digest("hex");
}
export function createLiveInviteToken():{token:string;digest:string} {
  const token=randomBytes(32).toString("base64url");
  const digest=digestLiveInviteToken(token);
  if(digest===null)throw new Error("Invalid generated invite token");
  return {token,digest};
}
