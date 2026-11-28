import {academyAdmissionMode} from "./academy-admission";
import {inspectBetaInvitations} from "./academy-beta-invite-ops";

type Issue={code:string;severity:"blocker"|"warning"};
/** Read-only, redacted staging readiness check. It never returns emails, codes, URLs or secrets. */
export function inspectAcademyBetaReadiness(env:NodeJS.ProcessEnv,now=Date.now()){
 const issues:Issue[]=[];
 const block=(code:string)=>issues.push({code,severity:"blocker"});
 const warn=(code:string)=>issues.push({code,severity:"warning"});
 if(!Number.isSafeInteger(now)||now<0)throw Error("Invalid preflight time");
 if(env.ACADEMY_ADMISSION_MODE!=="invite"||academyAdmissionMode(env)!=="invite")block("admission_not_invite_only");
 if(env.ACADEMY_TRIAL_ENABLED!=="true")block("trial_rollout_not_explicit");
 if(!env.SESSION_SECRET||Buffer.byteLength(env.SESSION_SECRET,"utf8")<32)block("session_secret_missing_or_short");
 if(!env.DATABASE_URL)block("database_connection_not_configured");
 let active=0,total=0,expired=0;
 try{
  if(!env.ACADEMY_INVITATIONS_JSON)throw Error("Missing invitations");
  const summary=inspectBetaInvitations(env.ACADEMY_INVITATIONS_JSON,now);
  active=summary.active;total=summary.total;expired=summary.expired;
  if(active===0)block("no_active_invitation");
  if(expired>0)warn("expired_invites_consume_pilot_slots");
 }catch{block("invitation_config_invalid");}
 // Local-only rate limiting is a known prelaunch limitation even with valid invitations.
 warn("shared_signup_rate_limit_required_before_public_launch");
 return {ready:issues.every(issue=>issue.severity!=="blocker"),activeInvitations:active,totalInvitations:total,expiredInvitations:expired,issues};
}
