import {bigint,index,int,mysqlEnum,mysqlTable,text,unique,varchar} from "drizzle-orm/mysql-core";
import {users} from "./schema";

// Draft only: generated in disposable MySQL lab, not production migration journal.
export const examGoals=mysqlTable("examGoals",{
 userId:int("userId").primaryKey().references(()=>users.id,{onDelete:"cascade"}),
 variant:mysqlEnum("variant",["ielts-academic","ielts-general"]).notNull(),
 targetBandHalfSteps:int("targetBandHalfSteps"),
 targetDate:varchar("targetDate",{length:10}),
 updatedAtMs:bigint("updatedAtMs",{mode:"number"}).notNull()
});
export const examCompletedActivities=mysqlTable("examCompletedActivities",{
 id:int("id").autoincrement().primaryKey(),
 userId:int("userId").notNull().references(()=>users.id,{onDelete:"cascade"}),
 attemptId:varchar("attemptId",{length:36}).notNull(),
 variant:mysqlEnum("variant",["ielts-academic","ielts-general"]).notNull(),
 skill:mysqlEnum("skill",["reading","listening"]).notNull(),
 exerciseId:varchar("exerciseId",{length:80}).notNull(),
 contentVersion:varchar("contentVersion",{length:80}).notNull(),
 mode:mysqlEnum("mode",["practice","timed"]).notNull(),
 correct:int("correct").notNull(),
 total:int("total").notNull(),
 receiptJson:text("receiptJson"), // server-derived feedback; no submitted raw answers
 completedAtMs:bigint("completedAtMs",{mode:"number"}).notNull()
},t=>({
 ownerAttempt:unique("examCompletedActivities_owner_attempt").on(t.userId,t.attemptId),
 ownerRecent:index("examCompletedActivities_owner_recent").on(t.userId,t.completedAtMs,t.id)
}));

export const examActiveAttempts=mysqlTable("examActiveAttempts",{
 userId:int("userId").primaryKey().references(()=>users.id,{onDelete:"cascade"}),
 attemptId:varchar("attemptId",{length:36}).notNull(),
 variant:mysqlEnum("variant",["ielts-academic","ielts-general"]).notNull(),
 skill:mysqlEnum("skill",["reading","listening"]).notNull(),
 mode:mysqlEnum("mode",["practice","timed"]).notNull(),
 exerciseId:varchar("exerciseId",{length:80}).notNull(),
 contentVersion:varchar("contentVersion",{length:80}).notNull(),
 deadlineMs:bigint("deadlineMs",{mode:"number"}).notNull()
});

export const examItineraries=mysqlTable("examItineraries",{
  userId:int("userId").primaryKey().references(()=>users.id,{onDelete:"cascade"}),
  revision:varchar("revision",{length:36}).notNull(),
  bookmarkJson:text("bookmarkJson").notNull(),
  savedAtMs:bigint("savedAtMs",{mode:"number"}).notNull(),
});
