import {bigint,index,int,mysqlEnum,mysqlTable,unique,varchar} from "drizzle-orm/mysql-core";
import {partnersDraft} from "./partner-foundation-draft";
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

export const trialCoupons=mysqlTable("trialCoupons",{
 id:int("id").autoincrement().primaryKey(),
 code:varchar("code",{length:40}).notNull().unique(),
 plan:mysqlEnum("plan",["lingua-premium","community-premium"]).notNull(),
 days:int("days").notNull(),
 redeemFromMs:bigint("redeemFromMs",{mode:"number"}).notNull(),
 redeemUntilMs:bigint("redeemUntilMs",{mode:"number"}).notNull(),
 maxUses:int("maxUses").notNull(),
 revokedAtMs:bigint("revokedAtMs",{mode:"number"}),
});
export const trialRedemptions=mysqlTable("trialRedemptions",{
 id:int("id").autoincrement().primaryKey(),
 couponId:int("couponId").notNull().references(()=>trialCoupons.id),
 userId:int("userId").notNull().references(()=>users.id),
 redeemedAtMs:bigint("redeemedAtMs",{mode:"number"}).notNull(),
},t=>({ownerCoupon:unique("trial_owner_coupon").on(t.couponId,t.userId)}));

export const commercialAdminAudit=mysqlTable("commercialAdminAudit",{
 id:int("id").autoincrement().primaryKey(),
 actorId:int("actorId").notNull().references(()=>users.id),
 action:mysqlEnum("action",["trial-issued","trial-revoked"]).notNull(),
 targetCode:varchar("targetCode",{length:40}).notNull(),
 occurredAtMs:bigint("occurredAtMs",{mode:"number"}).notNull(),
},t=>({actorTime:index("commercial_audit_actor_time").on(t.actorId,t.occurredAtMs)}));

export const commercialCashEntries=mysqlTable("commercialCashEntries",{
 id:int("id").autoincrement().primaryKey(),
 sourceKey:varchar("sourceKey",{length:180}).notNull().unique(),
 currency:mysqlEnum("currency",["BRL","USD","EUR"]).notNull(),
 kind:mysqlEnum("kind",["subscription","advertising","partner","refund","ai-cost","commission","operating-expense"]).notNull(),
 minorUnits:bigint("minorUnits",{mode:"number"}).notNull(),
 settledAtMs:bigint("settledAtMs",{mode:"number"}).notNull(),
 recordedAtMs:bigint("recordedAtMs",{mode:"number"}).notNull(),
},t=>({period:index("commercial_cash_period").on(t.settledAtMs,t.id)}));

export const commercialRecurringContracts=mysqlTable("commercialRecurringContracts",{
 id:int("id").autoincrement().primaryKey(),
 sourceKey:varchar("sourceKey",{length:180}).notNull().unique(),
 currency:mysqlEnum("currency",["BRL","USD","EUR"]).notNull(),
 amountMinor:bigint("amountMinor",{mode:"number"}).notNull(),
 intervalMonths:int("intervalMonths").notNull(),
 status:mysqlEnum("status",["active","pending","cancelled","suspended"]).notNull(),
 startsAtMs:bigint("startsAtMs",{mode:"number"}).notNull(),
 endsAtMs:bigint("endsAtMs",{mode:"number"}).notNull(),
},t=>({activePeriod:index("commercial_recurring_period").on(t.status,t.endsAtMs,t.startsAtMs)}));

export const commercialAdOrders=mysqlTable("commercialAdOrders",{
 id:int("id").autoincrement().primaryKey(),
 partnerId:int("partnerId").notNull().references(()=>partnersDraft.id),
 orderKey:varchar("orderKey",{length:180}).notNull().unique(),
 currency:mysqlEnum("currency",["BRL","USD","EUR"]).notNull(),
 amountMinor:bigint("amountMinor",{mode:"number"}).notNull(),
 paymentStatus:mysqlEnum("paymentStatus",["pending","paid","refunded","cancelled"]).notNull(),
 deliveryStatus:mysqlEnum("deliveryStatus",["draft","scheduled","active","ended","cancelled"]).notNull(),
 startsAtMs:bigint("startsAtMs",{mode:"number"}).notNull(),
 endsAtMs:bigint("endsAtMs",{mode:"number"}).notNull(),
 cashSourceKey:varchar("cashSourceKey",{length:180}).unique().references(()=>commercialCashEntries.sourceKey),
},t=>({partnerLookup:index("commercial_ads_partner").on(t.partnerId),deliveryLookup:index("commercial_ads_delivery").on(t.deliveryStatus,t.endsAtMs)}));
