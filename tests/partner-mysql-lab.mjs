import assert from "node:assert/strict";
import mysql from "mysql2/promise";
const db=await mysql.createConnection("mysql://partner_lab:partner_lab@127.0.0.1:33316/partner_lab");
const reject=async(sql,args,code)=>assert.rejects(()=>db.execute(sql,args),e=>e.code===code);
try {
 const [u]=await db.execute("INSERT INTO users (openId) VALUES (?)",["lab-user"]);
 const [a]=await db.execute("INSERT INTO partners (name) VALUES (?)",["A"]);
 const [b]=await db.execute("INSERT INTO partners (name) VALUES (?)",["B"]);
 const user=u.insertId, A=a.insertId,B=b.insertId;
 const membership="INSERT INTO partnerMembers (partnerId,userId) VALUES (?,?)";
 await db.execute(membership,[A,user]);
 await db.execute(membership,[B,user]);
 await reject(membership,[A,user],"ER_DUP_ENTRY");
 const [event]=await db.execute("INSERT INTO partnerEvents (partnerId,title,scheduledAt) VALUES (?,?,CURRENT_TIMESTAMP)",[A,"Lab event"]);
 const E=event.insertId;
 const invite="INSERT INTO partnerLiveInvites (partnerId,eventId,digest,issuedByUserId) VALUES (?,?,?,?)";
 await db.execute(invite,[A,E,"a".repeat(64),user]);
 await reject(invite,[A,E,"a".repeat(64),user],"ER_DUP_ENTRY");
 await reject(invite,[B,E,"b".repeat(64),user],"ER_NO_REFERENCED_ROW_2");
 await reject(invite,[A,E,"c".repeat(64),user+100000],"ER_NO_REFERENCED_ROW_2");
 const [rows]=await db.execute("SELECT status,visibility FROM partnerEvents WHERE id=?",[E]);
 assert.equal(rows[0].status,"draft");
 assert.equal(rows[0].visibility,"private");
 const [members]=await db.execute("SELECT role,status FROM partnerMembers WHERE partnerId=? AND userId=?",[A,user]);
 assert.equal(members[0].role,"viewer");
 assert.equal(members[0].status,"inactive");
 console.log("Partner MySQL laboratory: all assertions passed");
} finally {await db.end();}
