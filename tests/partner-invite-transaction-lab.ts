import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import {drizzle} from "drizzle-orm/mysql2";
import {issuePartnerInvite,revokePartnerInvite} from "../server/partner-invite-transaction";
import {digestLiveInviteToken} from "../server/partner-live-invite-token";
import type {ResultSetHeader,RowDataPacket} from "mysql2";
const pool=mysql.createPool("mysql://partner_lab:partner_lab@127.0.0.1:33316/partner_lab");
const db=drizzle({client:pool});
try{
 const [u]=await pool.execute<ResultSetHeader>("INSERT INTO users (openId) VALUES ('transaction-lab')");
 const [p]=await pool.execute<ResultSetHeader>("INSERT INTO partners (name,status) VALUES ('Transaction lab','active')");
 const user=u.insertId,partner=p.insertId;
 await pool.execute("INSERT INTO partnerMembers (partnerId,userId,role,status) VALUES (?,?,'owner','active')",[partner,user]);
 const [e]=await pool.execute<ResultSetHeader>("INSERT INTO partnerEvents (partnerId,title,visibility,status,scheduledAt) VALUES (?,'Lab','public','published',CURRENT_TIMESTAMP)",[partner]);
 const event=e.insertId;
 assert.equal(await issuePartnerInvite(db,user+100000,partner,event,null),null);
 const issued=await issuePartnerInvite(db,user,partner,event,null);
 assert.ok(issued);
 const digest=digestLiveInviteToken(issued.token);
 assert.ok(digest);
 const results=await Promise.all([revokePartnerInvite(db,user,partner,event,digest),revokePartnerInvite(db,user,partner,event,digest)]);
 assert.deepEqual(results,[true,true]);
 const [rows]=await pool.execute<RowDataPacket[]>("SELECT revokedAt FROM partnerLiveInvites WHERE digest=?",[digest]);
 assert.ok(rows[0]?.revokedAt);
 await pool.execute("UPDATE partners SET status='suspended' WHERE id=?",[partner]);
 assert.equal(await issuePartnerInvite(db,user,partner,event,null),null);
 console.log("Transactional invite laboratory passed");
}finally{await pool.end();}
