/** Billing routes are separately gated; nothing is chargeable by default. */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "./_core/trpc";
import { rateLimit, checkRequestOrigin } from "./auth-local";
import { billingFeatureEnabled } from "./billing-policy";
import { billingStatusForUser, createBillingCheckout, createBillingPortal } from "./billing-store";

export const billingRouter = router({
  status:protectedProcedure.query(async ({ctx})=>{
    try{return await billingStatusForUser(ctx.user.id);}
    catch{
      throw new TRPCError({code:"PRECONDITION_FAILED",message:"Status de assinatura temporariamente indisponível."});
    }
  }),
  createCheckout:protectedProcedure.input(z.object({
    currency:z.enum(["usd","brl"]),
    attemptId:z.string().min(12).max(80).regex(/^[A-Za-z0-9_-]+$/),
  })).mutation(async ({ctx,input})=>{
    checkRequestOrigin(ctx.req);
    if(!billingFeatureEnabled())throw new TRPCError({code:"PRECONDITION_FAILED",message:"Assinaturas ainda não disponíveis."});
    rateLimit("billing:checkout:"+ctx.user.id+":"+(ctx.req.ip??"unknown"));
    try{return await createBillingCheckout(ctx.user.id,ctx.user.email,input.currency,input.attemptId);}
    catch(error){
      if(error instanceof TRPCError)throw error;
      throw new TRPCError({code:"PRECONDITION_FAILED",message:"Não foi possível abrir o checkout de testes."});
    }
  }),
  createPortalSession:protectedProcedure.mutation(async ({ctx})=>{
    checkRequestOrigin(ctx.req);
    if(!billingFeatureEnabled())throw new TRPCError({code:"PRECONDITION_FAILED",message:"Gestão de assinatura não disponível."});
    rateLimit("billing:portal:"+ctx.user.id+":"+(ctx.req.ip??"unknown"));
    try{return await createBillingPortal(ctx.user.id,ctx.user.email);}
    catch(error){
      if(error instanceof TRPCError)throw error;
      throw new TRPCError({code:"PRECONDITION_FAILED",message:"Portal de assinatura indisponível."});
    }
  }),
});
