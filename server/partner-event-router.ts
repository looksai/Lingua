import {z} from "zod";
import {TRPCError} from "@trpc/server";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {router,protectedProcedure} from "./_core/trpc";
import {checkRequestOrigin} from "./auth-local";
import {listPartnerEvents,createPartnerEvent,transitionPartnerEvent} from "./partner-event-repository";
const id=z.number().int().positive().max(2147483647);
const scope=z.object({partnerId:id});
type Deps={enabled:()=>boolean;database:()=>Promise<MySql2Database|null>;allowRequest:(key:string)=>boolean};
export function createPartnerEventRouter(deps:Deps){
 async function dbFor(userId:number){
  if(!deps.enabled())throw new TRPCError({code:"NOT_FOUND"});
  if(!deps.allowRequest("event:"+userId))throw new TRPCError({code:"TOO_MANY_REQUESTS"});
  const db=await deps.database();if(!db)throw new TRPCError({code:"SERVICE_UNAVAILABLE"});return db;
 }
 return router({
  list:protectedProcedure.input(scope).query(async({ctx,input})=>{
   ctx.res.setHeader("Cache-Control","no-store");
   const result=await listPartnerEvents(await dbFor(ctx.user.id),ctx.user.id,input.partnerId);
   if(!result)throw new TRPCError({code:"NOT_FOUND"});return result;
  }),
  create:protectedProcedure.input(scope.extend({title:z.string().trim().min(1).max(200),visibility:z.enum(["public","private","subscriber"]),scheduledAt:z.number().int().min(1000).max(2147483647000)})).mutation(async({ctx,input})=>{
   checkRequestOrigin(ctx.req);
   const result=await createPartnerEvent(await dbFor(ctx.user.id),ctx.user.id,input.partnerId,input);
   if(!result)throw new TRPCError({code:"FORBIDDEN"});return result;
  }),
  transition:protectedProcedure.input(scope.extend({eventId:id,to:z.enum(["published","live","ended","cancelled"])})).mutation(async({ctx,input})=>{
   checkRequestOrigin(ctx.req);
   if(!await transitionPartnerEvent(await dbFor(ctx.user.id),ctx.user.id,input.partnerId,input.eventId,input.to))throw new TRPCError({code:"NOT_FOUND"});
   return {updated:true};
  }),
 });
}
