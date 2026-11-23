import { createHmac } from "node:crypto";
import { describe,it,expect } from "vitest";
import { verifyStripeSignature, createStripeTransport, stripeId } from "./stripe-http";
const secret="whsec_unit_test_secret";
const raw=Buffer.from(JSON.stringify({id:"evt_123456",data:{object:{id:"sub_123456"}}}));
const time=1763899200;
function makeHeader(body=raw,t=time){
  const hash=createHmac("sha256",secret).update(String(t)).update(".").update(body).digest("hex");
  return `t=${t},v1=${hash}`;
}
describe("Stripe signed raw webhook",()=>{
  it("accepts only current exact signed bytes",()=>{
    expect(verifyStripeSignature(raw,makeHeader(),secret,time*1000)).toBe(true);
    expect(verifyStripeSignature(raw,makeHeader(),secret,(time+301)*1000)).toBe(false);
    expect(verifyStripeSignature(Buffer.from(raw.toString()+" "),makeHeader(),secret,time*1000)).toBe(false);
    expect(verifyStripeSignature(raw,makeHeader(), "whsec_other_secret",time*1000)).toBe(false);
    expect(verifyStripeSignature(raw,"t=bad,v1=deadbeef",secret,time*1000)).toBe(false);
    expect(verifyStripeSignature(Buffer.alloc(131073),makeHeader(),secret,time*1000)).toBe(false);
  });
  it("rejects live keys, no unpinned live-mode billing",()=>{
    expect(()=>createStripeTransport({STRIPE_SECRET_KEY:"sk_live_never"})).toThrow();
    expect(()=>createStripeTransport({})).toThrow();
  });
  it("accepts underscore Stripe test-mode checkout ids",()=>{
    expect(stripeId("cs_test_123456789","cs")).toBe("cs_test_123456789");
    expect(stripeId("cs_test_123456789/path","cs")).toBeNull();
  });
});
