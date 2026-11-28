import {describe,it,expect,vi} from "vitest";
import {learningAccess} from "./commercial-learning-gate";
const user={id:42,createdAt:new Date(0)},now=16*86400000;
const env={ACADEMY_TRIAL_ENABLED:"true",LINGUA_COMMERCIAL_LAB_ENABLED:"true"};
describe("commercial learning gate",()=>{
 it("allows only the purchased benefit after the initial trial",async()=>{
 const allows=vi.fn(async(id:number,benefit:string)=>id===42&&benefit==="exams");
 expect(await learningAccess("exams.overview",user,allows,env,now)).toBe(true);
 expect(await learningAccess("learning.list",user,allows,env,now)).toBe(false);
 expect(await learningAccess("tutor.chat",user,allows,env,now)).toBe(false);
 });
 it("preserves active trial and privacy operations without database lookup",async()=>{
 const allows=vi.fn(async()=>false);
 expect(await learningAccess("learning.list",user,allows,env,1)).toBe(true);
 expect(await learningAccess("exams.privacyClear",user,allows,env,now)).toBe(true);
 expect(allows).not.toHaveBeenCalled();
 });
 it("fails closed on disabled commercial flag or repository error",async()=>{
 expect(await learningAccess("learning.list",user,async()=>true,{...env,LINGUA_COMMERCIAL_LAB_ENABLED:"false"},now)).toBe(false);
 expect(await learningAccess("learning.list",user,async()=>{throw Error("offline");},env,now)).toBe(false);
 });
});
