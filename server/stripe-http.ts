/** Minimal isolated Stripe HTTPS adapter; no new dependency or paid API.
 * Exact REST API version is pinned. Replace with the official pinned Node SDK
 * after dependency lockfile generation and review, without changing ownership
 * or entitlement rules. This adapter is TEST-ONLY (sk_test_) and fail-closed.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const STRIPE_API_VERSION = "2026-09-30.endive";
export type StripeJson = Record<string, unknown>;
export interface StripeTransport {
  get(path: string, query?: Record<string, string>): Promise<StripeJson>;
  post(path: string, body: Record<string, string>, idempotencyKey?: string): Promise<StripeJson>;
}

function testSecret(env: NodeJS.ProcessEnv): string {
  const key=env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_test_") || key.length < 16)
    throw new Error("Stripe sandbox key not configured; live keys are forbidden");
  return key;
}
export function createStripeTransport(env: NodeJS.ProcessEnv=process.env): StripeTransport {
  const key=testSecret(env);
  async function request(
    method: "GET"|"POST",
    path: string,
    params: Record<string,string>,
    idempotencyKey?: string,
  ):Promise<StripeJson>{
    if (!/^\/v1\/[A-Za-z0-9_/?=&%-]+$/.test(path) || path.includes(".."))
      throw new Error("Invalid internal Stripe API path");
    if (idempotencyKey && !/^[A-Za-z0-9:_-]{8,180}$/.test(idempotencyKey))
      throw new Error("Invalid Stripe idempotency key");
    const url=new URL("https://api.stripe.com"+path);
    const data=new URLSearchParams(params);
    if(method==="GET") url.search=data.toString();
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),9000);
    try{
      const headers:Record<string,string>={
        "Authorization":"Bearer "+key,
        "Stripe-Version":STRIPE_API_VERSION,
      };
      if(method==="POST")headers["Content-Type"]="application/x-www-form-urlencoded";
      if(idempotencyKey)headers["Idempotency-Key"]=idempotencyKey;
      const response=await fetch(url,{
        method,headers,body:method==="POST"?data.toString():undefined,
        redirect:"error",signal:controller.signal,
      });
      const obj=await response.json().catch(()=>null) as StripeJson|null;
      if(!response.ok || !obj || typeof obj!=="object" || Array.isArray(obj))
        throw new Error("Stripe API request rejected");
      return obj;
    }catch{
      // Do not leak Stripe headers, raw response bodies or secrets in logs.
      throw new Error("Stripe API temporarily unavailable");
    }finally{clearTimeout(timeout);}
  }
  return {
    get:(path,params={})=>request("GET",path,params),
    post:(path,params,key)=>request("POST",path,params,key),
  };
}

export function asObject(value:unknown):StripeJson|null {
  return value && typeof value==="object"&&!Array.isArray(value) ? value as StripeJson : null;
}
export function stripeId(value:unknown,prefix:string):string|null {
  return typeof value==="string" && new RegExp("^"+prefix+"_[A-Za-z0-9_]{6,160}$").test(value) ? value : null;
}
export function stripeRefId(value:unknown,prefix:string):string|null {
  if(typeof value==="string") return stripeId(value,prefix);
  return stripeId(asObject(value)?.id,prefix);
}
export function stripeInt(value:unknown):number|null {
  return Number.isSafeInteger(value) && typeof value==="number" && value>=0 ? value : null;
}
/** Stripe's documented signed-payload format is timestamp + "." + exact body.
 * Accept only v1 signatures within five minutes. No JSON reserialization.
 */
export function verifyStripeSignature(
  raw: Buffer,
  header: string|undefined,
  secret: string,
  nowMs=Date.now(),
):boolean{
  if(raw.length===0 || raw.length>131072 || !header ||
    !secret.startsWith("whsec_") || !Number.isFinite(nowMs))return false;
  const fields=header.split(",").map(s=>s.trim().split("=",2));
  const timestamps=fields.filter(([k])=>k==="t").map(([,v])=>v);
  if(timestamps.length!==1 || !/^\d{10,11}$/.test(timestamps[0]??""))return false;
  const t=Number(timestamps[0]);
  if(!Number.isSafeInteger(t) || Math.abs(nowMs-t*1000)>300000)return false;
  const digest=createHmac("sha256",secret).update(String(t)).update(".").update(raw).digest();
  return fields.some(([kind,signature])=>{
    if(kind!=="v1" || !signature || !/^[0-9a-f]{64}$/i.test(signature))return false;
    const provided=Buffer.from(signature,"hex");
    return provided.length===digest.length&&timingSafeEqual(provided,digest);
  });
}
