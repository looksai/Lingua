/** Signed Stripe HTTP webhook (raw bytes, before global JSON middleware). */
import type { RequestHandler } from "express";
import { billingFeatureEnabled } from "./billing-policy";
import { asObject, verifyStripeSignature } from "./stripe-http";
import { reconcileSignedStripeEvent } from "./billing-store";

export const stripeWebhookHandler:RequestHandler=async (req,res)=>{
  if(!billingFeatureEnabled()){res.status(503).send("Billing disabled");return;}
  const secret=process.env.STRIPE_WEBHOOK_SECRET;
  if(!Buffer.isBuffer(req.body) || req.body.length>131072 ||
     typeof secret!=="string" ||
     !verifyStripeSignature(req.body,req.headers["stripe-signature"] as string|undefined,secret)){
    res.status(400).send("Invalid webhook signature");return;
  }
  let event;
  try{event=asObject(JSON.parse(req.body.toString("utf8")));}
  catch{res.status(400).send("Invalid event");return;}
  if(!event){res.status(400).send("Invalid event");return;}
  try{
    const result=await reconcileSignedStripeEvent(event);
    res.status(200).json({received:true,result});
  }catch{
    // Stripe retries 5xx deliveries. No raw payload or secrets in logs.
    console.warn("[billing] signed webhook reconciliation failed; retry requested");
    res.status(503).send("Temporary reconciliation failure");
  }
};
