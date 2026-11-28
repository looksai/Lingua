import {bigint,boolean,int,mysqlTable,primaryKey,varchar,mysqlEnum,unique,index} from "drizzle-orm/mysql-core";
import {users} from "./schema";

export const communityBlocks=mysqlTable("communityBlocks",{
  ownerId:int("ownerId").notNull().references(()=>users.id,{onDelete:"cascade"}),
  targetId:int("targetId").notNull().references(()=>users.id,{onDelete:"cascade"}),
},t=>[primaryKey({columns:[t.ownerId,t.targetId]})]);

export const communityRestrictions=mysqlTable("communityRestrictions",{
  userId:int("userId").primaryKey().references(()=>users.id,{onDelete:"cascade"}),
  suspended:boolean("suspended").notNull(),
});

export const communityModerationAudit=mysqlTable("communityModerationAudit",{
  id:int("id").autoincrement().primaryKey(),
  actorId:int("actorId").notNull().references(()=>users.id),
  targetId:int("targetId").notNull().references(()=>users.id),
  suspended:boolean("suspended").notNull(),
  occurredAtMs:bigint("occurredAtMs",{mode:"number"}).notNull(),
});

 // Persistent moderation keyed by owner and achievement, independent of republication.
export const communityPublicationRestrictions=mysqlTable("communityPublicationRestrictions",{
 ownerId:int("ownerId").notNull().references(()=>users.id,{onDelete:"cascade"}),
 achievementId:varchar("achievementId",{length:80}).notNull(),
 hidden:boolean("hidden").notNull(),
},t=>[primaryKey({columns:[t.ownerId,t.achievementId]})]);

export const communityPublicationAudit=mysqlTable("communityPublicationAudit",{
 id:int("id").autoincrement().primaryKey(),
 actorId:int("actorId").notNull().references(()=>users.id),
 ownerId:int("ownerId").notNull().references(()=>users.id),
 achievementId:varchar("achievementId",{length:80}).notNull(),
 hidden:boolean("hidden").notNull(),
 occurredAtMs:bigint("occurredAtMs",{mode:"number"}).notNull(),
});

 // Lab-only reports: one report per reporter and publication revision.
export const communityPublicationReports=mysqlTable("communityPublicationReports",{
 id:int("id").autoincrement().primaryKey(),
 reporterId:int("reporterId").notNull().references(()=>users.id),
 ownerId:int("ownerId").notNull().references(()=>users.id),
 achievementId:varchar("achievementId",{length:80}).notNull(),
 publishedAtMs:bigint("publishedAtMs",{mode:"number"}).notNull(),
 reason:mysqlEnum("reason",["spam","harassment","inappropriate","other"]).notNull(),
 status:mysqlEnum("status",["pending","dismissed","actioned"]).notNull().default("pending"),
 createdAtMs:bigint("createdAtMs",{mode:"number"}).notNull(),
 resolvedAtMs:bigint("resolvedAtMs",{mode:"number"}),
 resolvedBy:int("resolvedBy").references(()=>users.id),
},t=>[unique("community_report_revision").on(t.reporterId,t.ownerId,t.achievementId,t.publishedAtMs),index("community_report_queue").on(t.status,t.id)]);
