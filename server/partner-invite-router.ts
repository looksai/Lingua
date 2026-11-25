import {z} from "zod";
import {TRPCError} from "@trpc/server";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {router,publicProcedure,protectedProcedure} from "./_core/trpc";
import {checkRequestOrigin} from "./auth-local";
import {issuePartnerInvite,revokePartnerInvite} from "./partner-invite-transaction";
import {resolvePublicPartnerInvite} from "./partner-public-invite-resolution";
const id=z.number().int().positive().max(2147483647);
const scope=z.object({partnerId:id,eventId:id});
type Dependencies={enabled:()=>boolean;database:()=>Promise<MySql2Database|null>;allowRequest:(key:string)=>boolean};
// Not mounted in appRouter. Explicit dependencies enable isolated HTTP tests.
export function createPartnerInviteRouter(deps:Dependencies){
 async function dbFor(key:string){
  if(!deps.enabled())throw new TRPCError({code:"NOT_FOUND"});
  if(!deps.allowRequest(key))throw new TRPCError({code:"TOO_MANY_REQUESTS"});
  const db=await deps.database();
  if(!db)throw new TRPCError({code:"SERVICE_UNAVAILABLE"});
  return db;
 }
 return router({
  issue:protectedProcedure.input(scope.extend({expiresAt:z.number().int().positive().max(2147483647000).nullable()})).mutation(async({ctx,input})=>{
   checkRequestOrigin(ctx.req);
   const db=await dbFor("member:"+ctx.user.id);
   const result=await issuePartnerInvite(db,ctx.user.id,input.partnerId,input.eventId,input.expiresAt);
   if(!result)throw new TRPCError({code:"FORBIDDEN"});
   return result;
  }),
  revoke:protectedProcedure.input(scope.extend({digest:z.string().regex(/^[a-f0-9]{64}$/)})).mutation(async({ctx,input})=>{
   checkRequestOrigin(ctx.req);
   const db=await dbFor("member:"+ctx.user.id);
   if(!await revokePartnerInvite(db,ctx.user.id,input.partnerId,input.eventId,input.digest))throw new TRPCError({code:"NOT_FOUND"});
   return {revoked:true};
  }),
  resolve:publicProcedure.input(z.object({token:z.string().length(43)})).mutation(async({ctx,input})=>{
   ctx.res.setHeader("Cache-Control","no-store");
   const db=await dbFor("visitor:"+(ctx.req.ip??"unknown"));
   return resolvePublicPartnerInvite(db,input.token);
  }),
 });
}
