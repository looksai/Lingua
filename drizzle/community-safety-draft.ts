import {bigint,boolean,int,mysqlTable,primaryKey} from "drizzle-orm/mysql-core";
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
