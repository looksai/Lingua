import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { billingCustomers, billingSubscriptions, stripeWebhookEvents } from "../drizzle/schema";
import { reconcileSignedStripeEvent } from "./billing-store";
import { getDb } from "./db";
import type { StripeTransport } from "./stripe-http";

vi.mock("./db",()=>({getDb:vi.fn()}));
const cus="cus_123456789",sid="sub_123456789",pid="price_123456789",invoiceId="in_123456789";
const event={id:"evt_123456789",type:"invoice.paid",livemode:false,created:1763900000,
  data:{object:{id:invoiceId,customer:cus,parent:{subscription_details:{subscription:sid}}}}};
function fakeDatabase(linkedCustomer=cus){
  const state:{
    event:Record<string,unknown>|null;
    subscription:Record<string,unknown>|null;
    inserts:number;
    updates:number;
  }={event:null,subscription:null,inserts:0,updates:0};
  const tx={
    select:()=>{
      return {from:(table:unknown)=>{
        const rows=()=>table===billingCustomers?[{userId:77,stripeCustomerId:linkedCustomer}]:
          table===stripeWebhookEvents?(state.event?[state.event]:[]):
          table===billingSubscriptions?(state.subscription?[state.subscription]:[]):[];
        const q:{where:()=>typeof q;limit:()=>typeof q;for:()=>Promise<unknown[]>;then:(f:(r:unknown[])=>unknown)=>Promise<unknown>}={
          where:()=>q,limit:()=>q,for:async()=>rows(),then:f=>Promise.resolve(rows()).then(f),
        };
        return q;
      }};
    },
    insert:(table:unknown)=>({values:async (values:Record<string,unknown>)=>{
      state.inserts++;
      if(table===stripeWebhookEvents)state.event=values;
      if(table===billingSubscriptions)state.subscription=values;
    }}),
    update:(table:unknown)=>({set:(values:Record<string,unknown>)=>({
      where:async()=>{
        state.updates++;
        if(table===stripeWebhookEvents)state.event={...state.event,...values};
        if(table===billingSubscriptions)state.subscription={...state.subscription,...values};
      },
    })}),
  };
  return {db:{transaction:async<T>(fn:(tx:typeof tx)=>Promise<T>)=>fn(tx)},state};
}
function fakeStripe(){
  let status="active",paid=true, calls=0;
  const client:StripeTransport={
    get:async(path)=>{
      calls++;
      if(path.includes("/v1/subscriptions/"))return{
        id:sid,customer:cus,livemode:false,status,latest_invoice:invoiceId,
        items:{data:[{quantity:1,price:{id:pid,currency:"usd"},current_period_end:1800000000}]},
      };
      if(path.includes("/v1/invoices/"))return{id:invoiceId,status:paid?"paid":"open",paid,customer:cus};
      throw Error("Unrecognized test Stripe GET");
    },
    post:async()=>{throw Error("Webhook must not create a payment");},
  };
  return {client,setStatus:(v:string)=>{status=v;},setPaid:(v:boolean)=>{paid=v;},count:()=>calls};
}
beforeEach(()=>{
  vi.stubEnv("STRIPE_BILLING_ENABLED","true");
  vi.stubEnv("STRIPE_SECRET_KEY","sk_test_dummy_key_123456789");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET","whsec_dummy_key_123456789");
  vi.stubEnv("STRIPE_PRICE_USD_MONTHLY",pid);
  vi.stubEnv("PUBLIC_APP_URL","https://lingua-p1-staging-le7u.onrender.com");
});
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
describe("durable Stripe event delivery and entitlement reconciliation",()=>{
  it("processes a paid event once, repeat is idempotent without extra API calls",async()=>{
    const f=fakeDatabase(),stripe=fakeStripe();
    vi.mocked(getDb).mockResolvedValue(f.db as never);
    expect(await reconcileSignedStripeEvent(event,stripe.client)).toBe("processed");
    expect(f.state.event?.status).toBe("done");
    expect(f.state.subscription?.status).toBe("active");
    expect(f.state.subscription?.userId).toBe(77);
    const firstCalls=stripe.count(),inserts=f.state.inserts;
    expect(await reconcileSignedStripeEvent(event,stripe.client)).toBe("duplicate");
    expect(stripe.count()).toBe(firstCalls);
    expect(f.state.inserts).toBe(inserts);
  });
  it("later failed payment cannot keep old paid entitlement",async()=>{
    const f=fakeDatabase(),stripe=fakeStripe();
    vi.mocked(getDb).mockResolvedValue(f.db as never);
    await reconcileSignedStripeEvent(event,stripe.client);
    stripe.setStatus("past_due");stripe.setPaid(false);
    // The fake DB represents one event row; a second event ID is a distinct row.
    f.state.event=null;
    const failed={...event,id:"evt_234567890",type:"invoice.payment_failed"};
    expect(await reconcileSignedStripeEvent(failed,stripe.client)).toBe("processed");
    expect(f.state.subscription?.status).toBe("past_due");
    expect(f.state.subscription?.paidThroughAt).toBeNull();
  });
  it("wrong Stripe customer is denied without database entitlement write",async()=>{
    const f=fakeDatabase("cus_wrongaccount"),stripe=fakeStripe();
    vi.mocked(getDb).mockResolvedValue(f.db as never);
    const wrong={...event,data:{object:{...event.data.object,customer:"cus_wrongaccount"}}};
    await expect(reconcileSignedStripeEvent(wrong,stripe.client)).rejects.toThrow();
    expect(f.state.inserts).toBe(0);
  });
});
