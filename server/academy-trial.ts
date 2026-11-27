export const TRIAL_DAYS = 15;
const DAY_MS = 86400000;
export type TrialStatus = {kind:"disabled"} | {kind:"active"|"expired";expiresAtMs:number;remainingDays:number} | {kind:"unavailable"};

/** Rollout is explicit; existing staging accounts are unchanged when disabled.
 * No billing authority exists on this branch: expiration never grants paid access.
 * Registration time comes from the authenticated database user, not the browser.
 */
export function academyTrialStatus(createdAt: Date|undefined, env:NodeJS.ProcessEnv=process.env, now=Date.now()):TrialStatus {
  if(env.ACADEMY_TRIAL_ENABLED===undefined||env.ACADEMY_TRIAL_ENABLED==="false")return {kind:"disabled"};
  if(env.ACADEMY_TRIAL_ENABLED!=="true")return {kind:"unavailable"};
  const start=createdAt instanceof Date?createdAt.getTime():NaN;
  const end=start+TRIAL_DAYS*DAY_MS;
  if(!Number.isSafeInteger(start)||start<0||!Number.isSafeInteger(now)||now<start||!Number.isSafeInteger(end))return {kind:"unavailable"};
  return {kind:now<end?"active":"expired",expiresAtMs:end,remainingDays:Math.max(0,Math.ceil((end-now)/DAY_MS))};
}

/** Gate learning operations, not login, privacy deletion/revocation or partner administration. */
export function trialGatedPath(path:string):boolean{
  const [scope]=path.split(".");
  if(!["onboarding","learning","placement","speech","tutor"].includes(scope))return false;
  return !["tutor.memoryList","tutor.memoryDelete","tutor.memoryClear","tutor.revokeCatalogConsent","placement.clear","learning.removeItem"].includes(path);
}
