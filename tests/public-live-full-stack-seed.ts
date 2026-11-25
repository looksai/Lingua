import mysql from "mysql2/promise";
import {drizzle} from "drizzle-orm/mysql2";
import {issuePartnerInvite} from "../server/partner-invite-transaction";
import type {ResultSetHeader} from "mysql2";
const url="mysql://partner_lab:partner_lab@127.0.0.1:33316/partner_lab";
if(process.env.DATABASE_URL!==url)throw new Error("Disposable database required");
const pool=mysql.createPool(url);
try{
 const [u]=await pool.execute<ResultSetHeader>("INSERT INTO users (openId) VALUES ('browser-lab')");
 const [p]=await pool.execute<ResultSetHeader>("INSERT INTO partners (name,status) VALUES ('Browser Lab','active')");
 await pool.execute("INSERT INTO partnerMembers (partnerId,userId,role,status) VALUES (?,?,'owner','active')",[p.insertId,u.insertId]);
 const [e]=await pool.execute<ResultSetHeader>("INSERT INTO partnerEvents (partnerId,title,visibility,status,scheduledAt) VALUES (?,'Evento integrado','public','published',CURRENT_TIMESTAMP)",[p.insertId]);
 const invite=await issuePartnerInvite(drizzle({client:pool}),u.insertId,p.insertId,e.insertId,null);
 if(!invite)throw new Error("Fixture issuance failed");
 process.stdout.write(invite.token);
}finally{await pool.end();}
