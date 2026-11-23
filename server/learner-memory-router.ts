import {TRPCError} from "@trpc/server";
import {and,desc,eq} from "drizzle-orm";
import {z} from "zod";
import {learnerMemories,learnerProfiles} from "../drizzle/schema";
import {router,protectedProcedure} from "./_core/trpc";
import {checkRequestOrigin} from "./auth-local";
import {getDb} from "./db";
import {freeTutorAllowed} from "./tutor-budget";
import {memoryFactHash,verifyMemoryProposal} from "./learner-memory-logic";

export function memoryWriteEnabled(email:string|null|undefined,env=process.env){
  return env.LINGUA_TUTOR_MEMORY_ENABLED==="true"&&freeTutorAllowed(email,env);
}
async function memoryDb(){
  const db=await getDb();
  if(!db)throw new TRPCError({code:"PRECONDITION_FAILED",message:"Memória indisponível neste ambiente."});
  return db;
}
const GENERIC_ERROR="Não foi possível acessar as memórias agora.";
const handleError=(err:unknown):never=>{
  if(err instanceof TRPCError)throw err;
  // ORM messages may include SQL values or personal data; never log raw.
  console.warn("[learner-memory] database action failed");
  throw new TRPCError({code:"PRECONDITION_FAILED",message:GENERIC_ERROR});
};

export const learnerMemoryRouter=router({
  list:protectedProcedure.query(async({ctx})=>{
    try{
      const db=await memoryDb();
      const rows=await db.select({id:learnerMemories.id,fato:learnerMemories.fato,
        categoria:learnerMemories.categoria,origem:learnerMemories.origem,
        createdAt:learnerMemories.createdAt})
        .from(learnerMemories).where(eq(learnerMemories.userId,ctx.user.id))
        .orderBy(desc(learnerMemories.createdAt),desc(learnerMemories.id)).limit(50);
      return rows;
    }catch(e){return handleError(e);}
  }),
  confirm:protectedProcedure.input(z.object({
    token:z.string().min(20).max(600),
    accepted:z.literal(true)
  })).mutation(async({ctx,input})=>{
    checkRequestOrigin(ctx.req);
    if(!memoryWriteEnabled(ctx.user.email))throw new TRPCError({
      code:"PRECONDITION_FAILED",message:"Memória de longo prazo não habilitada nesta conta."
    });
    const fact=verifyMemoryProposal(input.token,ctx.user.id,process.env.MANUS_JWT_SECRET??"");
    if(!fact)throw new TRPCError({code:"BAD_REQUEST",message:"Proposta inválida ou expirada; peça uma nova confirmação."});
    const hash=memoryFactHash(fact);
    try{
      const db=await memoryDb();
      return await db.transaction(async(tx)=>{
        // Lock one stable per-user row so duplicate approvals / concurrent tabs
        // cannot exceed the bounded number of accepted memories.
        const owner=await tx.select({userId:learnerProfiles.userId}).from(learnerProfiles)
          .where(eq(learnerProfiles.userId,ctx.user.id)).limit(1).for("update");
        if(!owner.length)throw new TRPCError({code:"PRECONDITION_FAILED",message:"Complete seu perfil para guardar lembranças."});
        const existing=await tx.select({id:learnerMemories.id}).from(learnerMemories)
          .where(and(eq(learnerMemories.userId,ctx.user.id),eq(learnerMemories.factHash,hash))).limit(1);
        if(existing[0])return {saved:true as const,duplicate:true as const,id:existing[0].id};
        const count=await tx.select({id:learnerMemories.id}).from(learnerMemories)
          .where(eq(learnerMemories.userId,ctx.user.id)).limit(50);
        if(count.length>=50)throw new TRPCError({code:"PRECONDITION_FAILED",
          message:"O limite de 50 lembranças foi atingido. Apague uma antiga para guardar outra."});
        const result=await tx.insert(learnerMemories).values({userId:ctx.user.id,
          fato:fact.fato,categoria:fact.categoria,origem:"student_confirmed_chat",factHash:hash});
        return {saved:true as const,duplicate:false as const,id:Number(result[0].insertId)};
      });
    }catch(e){return handleError(e);}
  }),
  delete:protectedProcedure.input(z.object({id:z.number().int().positive()})).mutation(async({ctx,input})=>{
    checkRequestOrigin(ctx.req);
    try{
      const db=await memoryDb();
      await db.delete(learnerMemories).where(and(eq(learnerMemories.id,input.id),
        eq(learnerMemories.userId,ctx.user.id)));
      return {deleted:true as const};
    }catch(e){return handleError(e);}
  }),
  clear:protectedProcedure.mutation(async({ctx})=>{
    checkRequestOrigin(ctx.req);
    try{
      const db=await memoryDb();
      await db.delete(learnerMemories).where(eq(learnerMemories.userId,ctx.user.id));
      return {deleted:true as const};
    }catch(e){return handleError(e);}
  })
});
export async function recentConfirmedMemories(userId:number){
  const db=await memoryDb();
  return db.select({fato:learnerMemories.fato,categoria:learnerMemories.categoria})
    .from(learnerMemories).where(eq(learnerMemories.userId,userId))
    .orderBy(desc(learnerMemories.createdAt),desc(learnerMemories.id)).limit(5);
}
