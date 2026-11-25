// Draft only: intentionally not exported from the production schema or migration config.
import {int,mysqlTable,mysqlEnum,varchar,timestamp,unique,index} from "drizzle-orm/mysql-core";
import {users} from "./schema";
export const partnersDraft=mysqlTable("partners",{
 id:int("id").autoincrement().primaryKey(),
 name:varchar("name",{length:160}).notNull(),
 status:mysqlEnum("status",["pending","active","suspended"]).notNull().default("pending"),
 createdAt:timestamp("createdAt").defaultNow().notNull(),
 updatedAt:timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export const partnerMembersDraft=mysqlTable("partnerMembers",{
 id:int("id").autoincrement().primaryKey(),
 partnerId:int("partnerId").notNull().references(()=>partnersDraft.id),
 userId:int("userId").notNull().references(()=>users.id),
 role:mysqlEnum("role",["owner","event_manager","viewer"]).notNull().default("viewer"),
 status:mysqlEnum("status",["active","inactive"]).notNull().default("inactive"),
 createdAt:timestamp("createdAt").defaultNow().notNull(),
 updatedAt:timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
},t=>({
 membership:unique("partner_member_unique").on(t.partnerId,t.userId),
 userLookup:index("partner_member_user_idx").on(t.userId),
}));
