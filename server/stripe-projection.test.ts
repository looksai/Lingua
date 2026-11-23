import { describe,it,expect } from "vitest";
import { eventScope, projectStripeSubscription } from "./stripe-projection";
const customer="cus_123456", sid="sub_123456", inv="in_123456", price="price_123456";
const invoice={id:inv,status:"paid",paid:true,customer};
const sub={id:sid,customer,livemode:false,status:"active",cancel_at_period_end:false,
  latest_invoice:inv,items:{data:[{quantity:1,price:{id:price,currency:"usd"},current_period_end:1800000000}]}};
const allowed=new Set([price]);
describe("signed-event projection must stay account-scoped",()=>{
  it("derives paid entitlement from latest invoice, exact customer and item period",()=>{
    const p=projectStripeSubscription(sub,invoice,customer,allowed);
    expect(p?.paidThroughAt?.getTime()).toBe(1800000000000);
    expect(p?.stripePriceId).toBe(price);
    expect(projectStripeSubscription(sub,invoice,"cus_otheraccount",allowed)).toBeNull();
    expect(projectStripeSubscription(sub,{...invoice,paid:false},customer,allowed)?.paidThroughAt).toBeNull();
    expect(projectStripeSubscription(sub,{...invoice,id:"in_wrong"},customer,allowed)?.paidThroughAt).toBeNull();
  });
  it("rejects unexpected prices and multi-item subscriptions",()=>{
    expect(projectStripeSubscription(sub,invoice,customer,new Set())).toBeNull();
    expect(projectStripeSubscription({...sub,items:{data:[...sub.items.data,...sub.items.data]}},invoice,customer,allowed)).toBeNull();
    expect(projectStripeSubscription({...sub,livemode:true},invoice,customer,allowed)).toBeNull();
  });
  it("requires test-mode subscription with authorized customer on each webhook",()=>{
    const base={id:"evt_123456",type:"customer.subscription.updated",created:1760000000,livemode:false,
      data:{object:{id:sid,customer}}};
    expect(eventScope(base)?.subscriptionId).toBe(sid);
    expect(eventScope({...base,livemode:true})).toBeNull();
    expect(eventScope({...base,data:{object:{id:sid}}})).toBeNull();
    const invoiceEvent={...base,type:"invoice.paid",data:{object:{id:inv,customer,
      parent:{subscription_details:{subscription:sid}}}}};
    expect(eventScope(invoiceEvent)?.subscriptionId).toBe(sid);
    expect(eventScope({...invoiceEvent,data:{object:{id:inv,customer}}})).toBeNull();
  });
});