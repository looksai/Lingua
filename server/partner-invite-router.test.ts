import express from "express";
import {createExpressMiddleware} from "@trpc/server/adapters/express";
import {describe,it,expect} from "vitest";
import {createPartnerInviteRouter} from "./partner-invite-router";
import type {User} from "../drizzle/schema";
import type {AddressInfo} from "node:net";
import {createPartnerInviteLimiter} from "./partner-invite-rate-limit";
describe("partner invite HTTP gates",()=>{
 it("blocks anonymous mutations, wrong origin, disabled API and excess requests before DB access",async()=>{
  let enabled=false,calls=0;
  const app=express();
  const api=createPartnerInviteRouter({enabled:()=>enabled,database:async()=>{calls++;return null;},allowRequest:createPartnerInviteLimiter({limit:1})});
  const user:User={id:1,openId:"local:lab",name:null,email:null,loginMethod:null,role:"user",createdAt:new Date(),updatedAt:new Date(),lastSignedIn:new Date()};
  app.use("/api",createExpressMiddleware({router:api,createContext:({req,res})=>({req,res,user:req.headers["x-lab-user"]==="1"?user:null})}));
  const server=app.listen(0,"127.0.0.1");
  try{
   await new Promise<void>(resolve=>server.once("listening",resolve));
   const origin="http://127.0.0.1:"+(server.address() as AddressInfo).port;
   const post=(route:string,json:unknown,headers:Record<string,string>={})=>fetch(origin+"/api/"+route,{method:"POST",headers:{"content-type":"application/json",...headers},body:JSON.stringify({json})});
   const issue={partnerId:1,eventId:1,expiresAt:null};
   expect((await post("issue",issue)).status).toBe(401);
   expect((await post("issue",issue,{"x-lab-user":"1",origin:"https://invalid.example"})).status).toBe(403);
   expect((await post("resolve",{token:"a".repeat(43)})).status).toBe(404);
   expect(calls).toBe(0);
   enabled=true;
   const response=await post("resolve",{token:"a".repeat(43)});
   expect(response.status).toBe(503);
   expect(response.headers.get("cache-control")).toBe("no-store");
   expect((await post("resolve",{token:"a".repeat(43)})).status).toBe(429);
   expect(calls).toBe(1);
  }finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
 });
});
