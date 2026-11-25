import mysql from "mysql2/promise";
import {drizzle} from "drizzle-orm/mysql2";
import {revokePartnerInvite} from "../server/partner-invite-transaction";
import {digestLiveInviteToken} from "../server/partner-live-invite-token";
import type {RowDataPacket,ResultSetHeader} from "mysql2";
const url="mysql://partner_lab:partner_lab@127.0.0.1:33316/partner_lab";
if(process.env.DATABASE_URL!==url)throw new Error("Disposable database required");
const digest=digestLiveInviteToken(process.env.LAB_INVITE_TOKEN??"");
if(!digest)throw new Error("Invalid fixture");
const pool=mysql.createPool(url);
try{
 const [rows]=await pool.execute<RowDataPacket[]>("SELECT i.partnerId,i.eventId,i.issuedByUserId FROM partnerLiveInvites i JOIN users u ON u.id=i.issuedByUserId WHERE i.digest=? AND u.openId='browser-lab'",[digest]);
 const row=rows[0];if(!row)throw new Error("Fixture not found");
 if(process.argv[2]==="live"){
  const [result]=await pool.execute<ResultSetHeader>("UPDATE partnerEvents SET status='live' WHERE id=? AND partnerId=? AND status='published'",[row.eventId,row.partnerId]);
  if(result.affectedRows!==1)throw new Error("Transition failed");
 }else if(process.argv[2]==="revoke"){
  if(!await revokePartnerInvite(drizzle({client:pool}),row.issuedByUserId,row.partnerId,row.eventId,digest))throw new Error("Revocation failed");
 }else throw new Error("Unknown transition");
}finally{await pool.end();}
