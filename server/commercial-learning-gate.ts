import {academyTrialStatus,trialGatedPath} from "./academy-trial";
import type {CommercialBenefit} from "../shared/commercial-entitlements";
export async function learningAccess(path:string,user:{id:number;createdAt?:Date},allows:(id:number,benefit:CommercialBenefit)=>Promise<boolean>,env:NodeJS.ProcessEnv=process.env,now=Date.now()){
 if(!trialGatedPath(path))return true;
 const trial=academyTrialStatus(user.createdAt,env,now);
 if(trial.kind==="active"||trial.kind==="disabled")return true;
 if(env.LINGUA_COMMERCIAL_LAB_ENABLED!=="true")return false;
 const scope=path.split(".")[0];
 const benefit:CommercialBenefit=scope==="exams"?"exams":scope==="tutor"?"tutor":"course";
 try{return await allows(user.id,benefit);}catch{return false;}
}
