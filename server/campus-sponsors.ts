import {z} from "zod";
const campaign=z.object({
 id:z.string().regex(/^[a-z0-9-]{1,64}$/),
 sponsor:z.string().trim().min(1).max(100),
 title:z.string().trim().min(1).max(120),
 description:z.string().trim().min(1).max(220),
 url:z.string().max(512).refine(value=>{
  try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password&&url.port===""&&url.hostname.includes(".")&&!url.hostname.endsWith(".local");}catch{return false;}
 }),
 startsAt:z.string().datetime(),endsAt:z.string().datetime(),
 approval:z.literal("approved_paid"),
}).strict();
export type CampusSponsor={id:string;sponsor:string;title:string;description:string;url:string};
/** Curated operator configuration only. Never accepts client campaigns or targets
 * students by identity, memory, immigration status or study profile. Approval is
 * an operator assertion, not proof of settlement. Billing integration is pending.
 */
export function campusSponsors(env:NodeJS.ProcessEnv=process.env,now=Date.now()):CampusSponsor[]{
 if(env.CAMPUS_SPONSORS_ENABLED!=="true"||!Number.isSafeInteger(now))return [];
 const raw=env.CAMPUS_SPONSORS_JSON;
 if(!raw||raw.length>32000)return [];
 try{
  const parsed=z.array(campaign).max(30).safeParse(JSON.parse(raw));
  if(!parsed.success)return [];
  const seen=new Set<string>();
  if(parsed.data.some(c=>{if(seen.has(c.id))return true;seen.add(c.id);return Date.parse(c.endsAt)<=Date.parse(c.startsAt);}))return [];
  return parsed.data.filter(c=>Date.parse(c.startsAt)<=now&&now<Date.parse(c.endsAt)).slice(0,3).map(({id,sponsor,title,description,url})=>({id,sponsor,title,description,url}));
 }catch{return [];}
}
