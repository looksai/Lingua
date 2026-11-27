// Draft only. Imported by disposable lab configuration, not production schema.
import {int,mysqlTable} from "drizzle-orm/mysql-core";
export const academyBudgetCounters=mysqlTable("academyBudgetCounters",{
  // 0 is the platform-wide counter; positive values are authenticated user IDs.
  scopeId:int("scopeId").primaryKey(),
  utcDay:int("utcDay").notNull(),
  used:int("used").notNull().default(0),
});
