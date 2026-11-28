import {useState} from "react";
import {trpc} from "@/lib/trpc";
import {COUPON_VALIDITY_PRESETS} from "../../../shared/admin-coupon-policy";
export function AdminPromotions(){
 const [code,setCode]=useState(""),[plan,setPlan]=useState<"lingua-premium"|"community-premium">("lingua-premium"),[kind,setKind]=useState("percent"),[currency,setCurrency]=useState<"BRL"|"USD"|"EUR">("BRL"),[amount,setAmount]=useState("10"),[days,setDays]=useState("3"),[date,setDate]=useState(""),[uses,setUses]=useState("1"),[revocation,setRevocation]=useState("");
 const issue=trpc.adminLab.issuePromotion.useMutation(),revoke=trpc.adminLab.revokePromotion.useMutation();
 const minor=/^\d+(\.\d{1,2})?$/.test(amount)?Math.round(Number(amount)*100):NaN;
 const expiry=Date.parse(date)+86400000;
 const validCode=(s:string)=>/^[A-Z0-9_-]{4,40}$/.test(s);
 const valid=validCode(code)&&Number.isSafeInteger(minor)&&minor>0&&(kind!=="percent"||minor<=10000)&&Number.isInteger(Number(uses))&&Number(uses)>=1&&Number(uses)<=100000&&(days==="date"?Number.isFinite(expiry)&&expiry>Date.now():Number.isInteger(Number(days))&&Number(days)>0&&Number(days)<=36500);
 return <section className="academy-state-card !m-0 !p-5"><h2 className="text-xl font-semibold">Cupons promocionais</h2><p>Descontos para compras elegíveis. A integração com checkout ainda está em preparação.</p>
 <form className="grid gap-4 my-4 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();if(valid&&!issue.isPending)issue.mutate({code,plan,discount:kind==="percent"?{kind:"percent",basisPoints:minor}:{kind:"fixed",currency,minorUnits:minor},validity:days==="date"?{kind:"date",expiresAtMs:expiry}:{kind:"days",days:Number(days)},maxUses:Number(uses)});}}>
 <label>Código<input className="block border rounded p-2 w-full" maxLength={40} value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/></label>
 <label>Plano<select className="block border rounded p-2 w-full" value={plan} onChange={e=>setPlan(e.target.value==="community-premium"?"community-premium":"lingua-premium")}><option value="lingua-premium">Lingua Premium</option><option value="community-premium">Community Premium</option></select></label>
 <label>Tipo de desconto<select className="block border rounded p-2 w-full" value={kind} onChange={e=>setKind(e.target.value)}><option value="percent">Percentual</option><option value="fixed">Valor fixo</option></select></label>
 {kind==="fixed"&&<label>Moeda<select className="block border rounded p-2 w-full" value={currency} onChange={e=>setCurrency(e.target.value==="USD"?"USD":e.target.value==="EUR"?"EUR":"BRL")}><option>BRL</option><option>USD</option><option>EUR</option></select></label>}
 <label>{kind==="percent"?"Desconto (%)":"Valor do desconto"}<input className="block border rounded p-2 w-full" type="number" min="0.01" step="0.01" max={kind==="percent"?100:undefined} value={amount} onChange={e=>setAmount(e.target.value)}/></label>
 <label>Validade<select className="block border rounded p-2 w-full" value={days} onChange={e=>setDays(e.target.value)}>{COUPON_VALIDITY_PRESETS.map(d=><option key={d} value={d}>{d===365?"1 ano (365 dias)":d+" dias"}</option>)}<option value="date">Data personalizada</option></select></label>
 {days==="date"&&<label>Último dia de resgate (UTC)<input className="block border rounded p-2" type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>}
 <label>Limite de resgates<input className="block border rounded p-2 w-full" type="number" min={1} max={100000} value={uses} onChange={e=>setUses(e.target.value)}/></label>
 <button className="academy-primary" disabled={!valid||issue.isPending}>Emitir promoção</button></form>
 {issue.error&&<p role="alert">Não foi possível emitir a promoção.</p>}{issue.data&&<p role="status">Promoção {issue.data.code} emitida. Vencimento: {new Date(issue.data.expiresAtMs).toISOString()}</p>}
 <form className="flex flex-wrap gap-3 items-end" onSubmit={e=>{e.preventDefault();if(validCode(revocation)&&!revoke.isPending&&window.confirm("Impedir novos resgates desta promoção?"))revoke.mutate({code:revocation});}}><label>Revogar promoção<input className="block border rounded p-2" value={revocation} onChange={e=>setRevocation(e.target.value.toUpperCase())}/></label><button className="academy-secondary" disabled={!validCode(revocation)||revoke.isPending}>Revogar</button></form>
 {revoke.error&&<p role="alert">Não foi possível revogar.</p>}{revoke.data&&<p role="status">Solicitação processada.</p>}</section>;
}
