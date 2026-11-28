import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { MySql2Database } from "drizzle-orm/mysql2";
import type { z } from "zod";
import { users } from "../drizzle/schema";
import { examItineraries as rows } from "../drizzle/exam-history-draft";
import { itineraryBookmark, saveItineraryInput } from "../shared/exam-itinerary";

// The previous history schema had no bookmark table. All other SQL failures
// must propagate, especially during privacy export or deletion.
export async function optionalItineraryTable<T>(operation:()=>Promise<T>, absent:T) {
  try { return await operation(); }
  catch (error) {
    const cause=error instanceof Error ? error.cause : null;
    if (cause && typeof cause==="object" && "code" in cause && cause.code==="ER_NO_SUCH_TABLE") return absent;
    throw error;
  }
}
export async function readItinerary(db:MySql2Database,owner:number) {
  const [row]=await db.select().from(rows).where(eq(rows.userId,owner)).limit(1);
  return row ? {revision:row.revision,savedAtMs:row.savedAtMs,bookmark:itineraryBookmark.parse(JSON.parse(row.bookmarkJson))} : null;
}
export async function saveItinerary(db:MySql2Database,owner:number,input:z.infer<typeof saveItineraryInput>) {
  const request=saveItineraryInput.parse(input);
  if(request.accountId!==owner) throw new TRPCError({code:"FORBIDDEN"});
  return db.transaction(async tx=>{
    const [user]=await tx.select({id:users.id}).from(users).where(eq(users.id,owner)).for("update");
    if(!user) throw new TRPCError({code:"FORBIDDEN"});
    const [current]=await tx.select().from(rows).where(eq(rows.userId,owner)).for("update");
    const bookmarkJson=JSON.stringify(request.bookmark);
    if(current?.bookmarkJson===bookmarkJson) return {revision:current.revision};
    if((current?.revision??null)!==request.expectedRevision) throw new TRPCError({code:"CONFLICT",message:"O roteiro salvo mudou. Confira a versão atual."});
    const values={revision:randomUUID(),savedAtMs:Date.now(),bookmarkJson};
    await tx.insert(rows).values({userId:owner,...values}).onDuplicateKeyUpdate({set:values});
    return {revision:values.revision};
  });
}

export async function removeItinerary(db:MySql2Database,owner:number,revision:string) {
  return db.transaction(async tx=>{
    await tx.select({id:users.id}).from(users).where(eq(users.id,owner)).for("update");
    const [current]=await tx.select({revision:rows.revision}).from(rows).where(eq(rows.userId,owner)).for("update");
    if(!current)return;
    if(current.revision!==revision)throw new TRPCError({code:"CONFLICT",message:"O roteiro salvo mudou. Confira a versão atual."});
    await tx.delete(rows).where(and(eq(rows.userId,owner),eq(rows.revision,revision)));
  });
}
