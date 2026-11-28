import {eq} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {commercialSubscriptions as subscriptions} from "../drizzle/commercial-draft";
import {createCommercialAccess,type SubscriptionRepository} from "./commercial-access";
export function commercialRepository(db:MySql2Database):SubscriptionRepository{
 return {async listForOwner(userId){
 if(!Number.isSafeInteger(userId)||userId<=0||userId>2147483647)return [];
 return db.select({userId:subscriptions.userId,plan:subscriptions.plan,status:subscriptions.status,startsAtMs:subscriptions.startsAtMs,endsAtMs:subscriptions.endsAtMs}).from(subscriptions).where(eq(subscriptions.userId,userId));
 }};
}
export function commercialAccessLab(db:MySql2Database){return createCommercialAccess(commercialRepository(db));}
