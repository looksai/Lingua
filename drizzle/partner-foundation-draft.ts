// Draft only: intentionally not exported from the production schema or migration config.
import {int,mysqlTable,mysqlEnum,varchar,timestamp,unique,index,foreignKey} from "drizzle-orm/mysql-core";
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

export const partnerEventsDraft=mysqlTable("partnerEvents",{
 id:int("id").autoincrement().primaryKey(),
 partnerId:int("partnerId").notNull().references(()=>partnersDraft.id),
 title:varchar("title",{length:200}).notNull(),
 visibility:mysqlEnum("visibility",["public","private","subscriber"]).notNull().default("private"),
 status:mysqlEnum("status",["draft","published","live","ended","cancelled"]).notNull().default("draft"),
 scheduledAt:timestamp("scheduledAt").notNull(),
 createdAt:timestamp("createdAt").defaultNow().notNull(),
 updatedAt:timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
},t=>({
 tenantEvent:unique("partner_event_tenant_unique").on(t.partnerId,t.id),
 schedule:index("partner_event_schedule_idx").on(t.partnerId,t.scheduledAt),
}));
export const partnerLiveInvitesDraft=mysqlTable("partnerLiveInvites",{
 id:int("id").autoincrement().primaryKey(),
 partnerId:int("partnerId").notNull(),
 eventId:int("eventId").notNull(),
 digest:varchar("digest",{length:64}).notNull(),
 issuedByUserId:int("issuedByUserId").notNull().references(()=>users.id),
 expiresAt:timestamp("expiresAt"),
 revokedAt:timestamp("revokedAt"),
 createdAt:timestamp("createdAt").defaultNow().notNull(),
},t=>({
 digestUnique:unique("partner_live_invite_digest_unique").on(t.digest),
 eventTenant:foreignKey({name:"partner_live_invite_event_tenant_fk",columns:[t.partnerId,t.eventId],foreignColumns:[partnerEventsDraft.partnerId,partnerEventsDraft.id]}),
}));
