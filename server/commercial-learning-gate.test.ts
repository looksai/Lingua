import {describe,it,expect,vi} from "vitest";
import {learningAccess,resolveLearningAccess} from "./commercial-learning-gate";

const user = {id:42,createdAt:new Date(0)};
const now = 15 * 86400000;
const env = {ACADEMY_TRIAL_ENABLED:"true",LINGUA_COMMERCIAL_LAB_ENABLED:"true"};

describe("effective learning access",()=>{
  it("limits a Community grant to its own modules at trial expiry",async()=>{
    const read = vi.fn().mockResolvedValue(["exams","community"]);
    expect(await resolveLearningAccess(user,read,env,now)).toMatchObject({course:false,tutor:false,exams:true,community:true});
    expect(read).toHaveBeenCalledTimes(1); expect(read).toHaveBeenCalledWith(user.id);
  });
  it.each(["active","disabled"])("preserves independent Academy access when %s",async kind=>{
    const read=vi.fn();
    expect(await resolveLearningAccess(user,read,{...env,ACADEMY_TRIAL_ENABLED:String(kind==="active")},now-1)).toMatchObject({course:true,tutor:true,exams:true});
    expect(read).not.toHaveBeenCalled();
  });
  it("honors the rollout switch and propagates storage failure without granting access",async()=>{
    const read=vi.fn().mockRejectedValue(Error("offline"));
    expect(await resolveLearningAccess(user,read,{...env,LINGUA_COMMERCIAL_LAB_ENABLED:"false"},now)).toMatchObject({course:false,exams:false});
    expect(read).not.toHaveBeenCalled();
    await expect(resolveLearningAccess(user,read,env,now)).rejects.toThrow("offline");
    expect(await learningAccess("exams.privacyClear",user)).toBe(true);
  });
});
