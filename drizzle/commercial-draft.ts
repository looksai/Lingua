import {bigint,index,int,mysqlEnum,mysqlTable,unique,varchar} from "drizzle-orm/mysql-core";
import {users} from "./schema";
// Laboratory schema only. No production migration.
export const commercialSubscriptions=mysqlTable("commercialSubscriptions",{
 id:int("id").autoincrement().primaryKey(),
 userId:int("userId").notNull().references(()=>users.id,{onDelete:"cascade"}),
 plan:mysqlEnum("plan",["lingua-premium","community-premium"]).notNull(),
 status:mysqlEnum("status",["active","cancelled","expired","pending","suspended"]).notNull(),
 source:mysqlEnum("source",["paid","trial-coupon","admin-grant"]).notNull(),
 sourceId:varchar("sourceId",{length:180}).notNull(),
 startsAtMs:bigint("startsAtMs",{mode:"number"}).notNull(),
 endsAtMs:bigint("endsAtMs",{mode:"number"}).notNull(),
},t=>({sourceUnique:unique("commercial_owner_source").on(t.userId,t.source,t.sourceId),ownerStatus:index("commercial_owner_status").on(t.userId,t.status,t.endsAtMs)}));
