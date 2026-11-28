import {bigint,boolean,index,int,mysqlEnum,mysqlTable,unique,varchar} from "drizzle-orm/mysql-core";
import {users} from "./schema";

// Lab draft only; not registered in the production migration journal.
export const gamificationEvidence=mysqlTable("gamificationEvidence",{
 id:int("id").autoincrement().primaryKey(),
 userId:int("userId").notNull().references(()=>users.id,{onDelete:"cascade"}),
 kind:mysqlEnum("kind",["lesson_completed","review_completed","oral_practice_completed","integrated_practice_completed"]).notNull(),
 sourceId:varchar("sourceId",{length:180}).notNull(),
 occurredAtMs:bigint("occurredAtMs",{mode:"number"}).notNull(),
 policyVersion:varchar("policyVersion",{length:40}).notNull(),
 awardedXp:int("awardedXp").notNull(),
},t=>({
 ownerEvidence:unique("gamification_owner_evidence").on(t.userId,t.kind,t.sourceId),
 ownerDay:index("gamification_owner_day").on(t.userId,t.kind,t.occurredAtMs),
}));
export const gamificationPrivacy=mysqlTable("gamificationPrivacy",{
 userId:int("userId").primaryKey().references(()=>users.id,{onDelete:"cascade"}),
 showLevel:boolean("showLevel").notNull().default(false),
 showAchievements:boolean("showAchievements").notNull().default(false),
 leaderboardOptIn:boolean("leaderboardOptIn").notNull().default(false),
 updatedAtMs:bigint("updatedAtMs",{mode:"number"}).notNull(),
});

export const gamificationShares=mysqlTable("gamificationShares",{
 id:int("id").autoincrement().primaryKey(),
 userId:int("userId").notNull().references(()=>users.id,{onDelete:"cascade"}),
 achievementId:varchar("achievementId",{length:80}).notNull(),
 publishedAtMs:bigint("publishedAtMs",{mode:"number"}).notNull(),
 revokedAtMs:bigint("revokedAtMs",{mode:"number"}),
},t=>({
 ownerAchievement:unique("gamification_share_owner_achievement").on(t.userId,t.achievementId),
 feedOrder:index("gamification_share_feed_order").on(t.revokedAtMs,t.publishedAtMs,t.id),
}));
