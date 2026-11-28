import {useState} from "react";
import {trpc} from "@/lib/trpc";
const day=86400000;
const iso=(ms:number)=>new Date(ms).toISOString().slice(0,10);
const money=(currency:string,minor:number|undefined)=>minor===undefined?"—":new Intl.NumberFormat("pt-BR",{style:"currency",currency}).format(minor/100);
export function AdminFinance(){
 const [today]=useState(()=>Date.now());
 const [from,setFrom]=useState(()=>iso(today-29*day));
 const [to,setTo]=useState(()=>iso(today));
 const start=Date.parse(from),end=Date.parse(to)+day;
 const valid=Number.isFinite(start)&&Number.isFinite(end)&&start>=0&&end>start&&end-start<=366*day;
 const finance=trpc.adminLab.finance.useQuery({fromMs:valid?start:0,toMs:valid?end:1},{enabled:valid,retry:false});
 const recurring=trpc.adminLab.recurring.useQuery(undefined,{retry:false});
 return <section className="academy-state-card !m-0 !p-5"><h2 className="text-xl font-semibold">Controle financeiro</h2><p>Caixa realizado por período e receita recorrente contratada atual. Moedas não são somadas.</p>
 <div className="flex flex-wrap gap-4 my-4"><label>De (UTC)<input className="block border rounded p-2" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Até (UTC, inclusive)<input className="block border rounded p-2" type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><button className="academy-secondary" disabled={!valid} onClick={()=>{void finance.refetch();void recurring.refetch();}}>Atualizar financeiro</button></div>
 {!valid&&<p role="alert">Selecione um período válido de até 366 dias.</p>}
 {(finance.isError||recurring.isError)&&<p role="alert">Dados financeiros indisponíveis.</p>}
 <div className="overflow-x-auto"><table className="w-full text-left"><caption className="sr-only">Totais financeiros por moeda</caption><thead><tr>{["Moeda","Receitas","Reembolsos","Despesas","Saldo de caixa","MRR contratado"].map(label=><th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead><tbody>{["BRL","USD","EUR"].map(currency=>{const c=valid?finance.data?.totals.find(t=>t.currency===currency):undefined;const r=recurring.data?.totals.find(t=>t.currency===currency);return <tr key={currency} className="border-t"><th scope="row" className="p-2">{currency}</th>{[c?.revenue,c?.refunds,c?.expenses,c?.net,r?.mrrMinor].map((v,i)=><td key={i} className="p-2 whitespace-nowrap tabular-nums">{money(currency,v)}</td>)}</tr>})}</tbody></table></div>
 <p className="text-xs mt-3">Saldo de caixa não equivale a lucro contábil. MRR não equivale a dinheiro recebido.</p></section>;
}
