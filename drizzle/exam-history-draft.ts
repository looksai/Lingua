import {bigint,index,int,mysqlEnum,mysqlTable,unique,varchar} from "drizzle-orm/mysql-core";
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
 completedAtMs:bigint("completedAtMs",{mode:"number"}).notNull()
},t=>({
 ownerAttempt:unique("examCompletedActivities_owner_attempt").on(t.userId,t.attemptId),
 ownerRecent:index("examCompletedActivities_owner_recent").on(t.userId,t.completedAtMs,t.id)
}));
