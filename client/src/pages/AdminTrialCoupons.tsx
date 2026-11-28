import {useState} from "react";
import {trpc} from "@/lib/trpc";
import {TRIAL_DAYS,COUPON_VALIDITY_PRESETS} from "../../../shared/admin-coupon-policy";
export function AdminTrialCoupons(){
 const [code,setCode]=useState(""),[plan,setPlan]=useState<"lingua-premium"|"community-premium">("lingua-premium"),[days,setDays]=useState(30),[validity,setValidity]=useState("3"),[date,setDate]=useState(""),[uses,setUses]=useState("1"),[revokeCode,setRevokeCode]=useState("");
 const utils=trpc.useUtils();
 const issue=trpc.adminLab.issue.useMutation({onSuccess:()=>{void utils.adminLab.metrics.invalidate();}});
 const revoke=trpc.adminLab.revoke.useMutation({onSuccess:()=>{void utils.adminLab.metrics.invalidate();}});
 const validCode=(v:string)=>/^[A-Z0-9_-]{4,40}$/.test(v);
 const expiry=Date.parse(date)+86400000;
 const valid=validCode(code)&&Number.isInteger(Number(uses))&&Number(uses)>=1&&Number(uses)<=100000&&(validity==="date"?Number.isFinite(expiry)&&expiry>Date.now():Number.isInteger(Number(validity))&&Number(validity)>0&&Number(validity)<=36500);
 return <section className="academy-state-card !m-0 !p-5"><h2 className="text-xl font-semibold">Cupons de teste</h2><p>A validade para resgatar o código é independente da duração do acesso. Não gera cobrança automática.</p>
 <form className="grid gap-4 my-4 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();if(valid&&!issue.isPending)issue.mutate({code,plan,days,maxUses:Number(uses),validity:validity==="date"?{kind:"date",expiresAtMs:expiry}:{kind:"days",days:Number(validity)}});}}>
 <label>Código<input className="block border rounded p-2 w-full" required maxLength={40} value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/></label>
 <label>Plano<select className="block border rounded p-2 w-full" value={plan} onChange={e=>setPlan(e.target.value==="community-premium"?"community-premium":"lingua-premium")}><option value="lingua-premium">Lingua Premium</option><option value="community-premium">Community Premium</option></select></label>
 <label>Duração do acesso<select className="block border rounded p-2 w-full" value={days} onChange={e=>setDays(Number(e.target.value))}>{TRIAL_DAYS.map(d=><option key={d} value={d}>{d} dias</option>)}</select></label>
 <label>Validade para resgate<select className="block border rounded p-2 w-full" value={validity} onChange={e=>setValidity(e.target.value)}>{COUPON_VALIDITY_PRESETS.map(d=><option key={d} value={d}>{d===365?"1 ano (365 dias)":d+" dias"}</option>)}<option value="date">Data personalizada</option></select></label>
 {validity==="date"&&<label>Último dia para resgate (UTC)<input className="block border rounded p-2" type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label>}
 <label>Limite de resgates<input className="block border rounded p-2 w-full" type="number" min={1} max={100000} required value={uses} onChange={e=>setUses(e.target.value)}/></label>
 <button className="academy-primary" disabled={!valid||issue.isPending} type="submit">Emitir cupom</button>
 </form>
 {issue.error&&<p role="alert">Não foi possível emitir o cupom. Confira o código e a configuração.</p>}
 {issue.data&&<p role="status">Cupom {issue.data.code} emitido. Expira em {new Date(issue.data.expiresAtMs).toLocaleString("pt-BR",{timeZone:"UTC"})} UTC.</p>}
 <form className="border-t pt-4 flex flex-wrap gap-3 items-end" onSubmit={e=>{e.preventDefault();if(validCode(revokeCode)&&!revoke.isPending&&window.confirm("Impedir novos resgates deste código? Acessos já concedidos serão preservados."))revoke.mutate({code:revokeCode});}}><label>Revogar código<input className="block border rounded p-2" value={revokeCode} onChange={e=>setRevokeCode(e.target.value.toUpperCase())}/></label><button className="academy-secondary" disabled={!validCode(revokeCode)||revoke.isPending}>Revogar</button></form>
 {revoke.error&&<p role="alert">Não foi possível processar a revogação.</p>}{revoke.data&&<p role="status">Solicitação de revogação processada.</p>}
 </section>;
}
