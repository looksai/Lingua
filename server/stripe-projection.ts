import { asObject, stripeId, stripeInt, stripeRefId, type StripeJson } from "./stripe-http";

export type StripeSubscriptionProjection = {
  stripeSubscriptionId:string;
  customerId:string;
  stripePriceId:string;
  currency:string;
  status:string;
  currentPeriodEnd:Date|null;
  paidThroughAt:Date|null;
  cancelAtPeriodEnd:boolean;
};
export const BILLING_EVENT_TYPES=new Set([
  "checkout.session.completed",
  "invoice.paid",
  "invoice.payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);
export function eventScope(event:StripeJson):{
  id:string; type:string; createdAt:Date; customerId:string|null;
  subscriptionId:string|null; sessionId:string|null;
}|null{
  const id=stripeId(event.id,"evt");
  const type=typeof event.type==="string" ? event.type : "";
  const created=stripeInt(event.created);
  const payload=asObject(asObject(event.data)?.object);
  if(!id||!type||created===null||!payload||event.livemode!==false)return null;
  const customerId=stripeRefId(payload.customer,"cus");
  if(type==="checkout.session.completed"){
    const sessionId=stripeId(payload.id,"cs");
    if(!sessionId||!customerId)return null;
    return {id,type,createdAt:new Date(created*1000),customerId,subscriptionId:stripeRefId(payload.subscription,"sub"),sessionId};
  }
  if(type.startsWith("customer.subscription.")){
    const subscriptionId=stripeId(payload.id,"sub");
    if(!subscriptionId||!customerId)return null;
    return {id,type,createdAt:new Date(created*1000),customerId,subscriptionId,sessionId:null};
  }
  if(type.startsWith("invoice.")){
    const parent=asObject(payload.parent);
    const detail=asObject(parent?.subscription_details);
    const subscriptionId=stripeRefId(detail?.subscription,"sub") || stripeRefId(payload.subscription,"sub");
    if(!subscriptionId || !customerId)return null;
    return {id,type,createdAt:new Date(created*1000),customerId,subscriptionId,sessionId:null};
  }
  return null;
}
function unixDate(value:unknown):Date|null{
  const n=stripeInt(value);
  if(n===null||n<946684800||n>253402300799)return null;
  return new Date(n*1000);
}
export function projectStripeSubscription(
  sub:StripeJson,
  invoice:StripeJson|null,
  expectedCustomer:string,
  allowedPrices:ReadonlySet<string>,
):StripeSubscriptionProjection|null{
  const sid=stripeId(sub.id,"sub"), customer=stripeRefId(sub.customer,"cus");
  if(!sid || !customer || customer!==expectedCustomer || sub.livemode!==false) return null;
  const items=asObject(sub.items);
  const rows=items && Array.isArray(items.data)?items.data:[];
  if(rows.length!==1)return null;
  const item=asObject(rows[0]),price=asObject(item?.price);
  const priceId=stripeRefId(item?.price,"price");
  const currency=typeof price?.currency==="string" ? price.currency.toLowerCase() : "";
  const quantity=typeof item?.quantity==="number"?item.quantity:0;
  if(!priceId || !allowedPrices.has(priceId) || !["usd","brl"].includes(currency) || quantity!==1)
    return null;
  const period=unixDate(item?.current_period_end);
  const status=typeof sub.status==="string" ? sub.status : "unknown";
  const latestInvoiceId=stripeRefId(sub.latest_invoice,"in");
  const paid=invoice?.id===latestInvoiceId && invoice?.status==="paid" &&
    invoice?.paid===true && stripeRefId(invoice?.customer,"cus")===customer;
  const paidThrough=paid&&period ? period : null;
  return {
    stripeSubscriptionId:sid,customerId:customer,stripePriceId:priceId,
    currency,status,currentPeriodEnd:period,paidThroughAt:paidThrough,
    cancelAtPeriodEnd:sub.cancel_at_period_end===true,
  };
}

/** Check the actual Stripe Price, not only our configured identifier. */
export function validStripeMonthlyPrice(
  value:StripeJson,
  expectedId:string,
  currency:"usd"|"brl",
):boolean{
  const recurring=asObject(value.recurring);
  const amount=stripeInt(value.unit_amount);
  return value.id===expectedId && value.livemode===false &&
    value.active===true && value.type==="recurring" && value.currency===currency &&
    recurring?.interval==="month" && recurring.interval_count===1 &&
    recurring.usage_type==="licensed" &&
    amount!==null && amount>0 && (currency!=="usd" || amount===990);
}
