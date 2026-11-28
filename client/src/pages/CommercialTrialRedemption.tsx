import {useState} from "react";
import {trpc} from "@/lib/trpc";
export default function CommercialTrialRedemption(){
 const identity=trpc.auth.me.useQuery(undefined,{retry:false});
 if(identity.isPending)return <main role="status">Confirmando sessão...</main>;
 if(identity.error)return <main role="alert">Não foi possível confirmar sua sessão.</main>;
 if(!identity.data)return <main className="academy-state-card"><h1>Resgatar cupom</h1><a href="/login">Entre na sua conta para continuar</a></main>;
 return <Redemption key={identity.data.id}/>;
}
function Redemption(){
 const [code,setCode]=useState("");
 const redeem=trpc.commercialLab.redeemTrial.useMutation();
 const valid=/^[A-Z0-9_-]{4,40}$/.test(code);
 return <main className="academy-interior px-5 py-8"><section className="academy-state-card"><h1 className="font-display text-3xl">Resgatar acesso de teste</h1><p>Informe o código recebido. Não há cobrança automática.</p><form className="grid gap-3 mt-5" onSubmit={e=>{e.preventDefault();if(valid&&!redeem.isPending)redeem.mutate({code});}}><label>Código do cupom<input className="block border rounded p-2 w-full" autoComplete="off" maxLength={40} value={code} onChange={e=>{setCode(e.target.value.toUpperCase());redeem.reset();}} disabled={redeem.isPending}/></label><button className="academy-primary" disabled={!valid||redeem.isPending}>Resgatar cupom</button></form>
 {redeem.error&&<p role="alert">Não foi possível resgatar este cupom. Confira o código e tente novamente.</p>}
 {redeem.data?.status==="already-redeemed"&&<p role="status">Este cupom já foi resgatado nesta conta.</p>}
 {redeem.data?.status==="granted"&&<div role="status"><h2>Acesso registrado</h2><p>{redeem.data.plan==="lingua-premium"?"Lingua Premium":"Community Premium"}</p><p>Válido até {new Date(redeem.data.endsAtMs).toLocaleString("pt-BR")}.</p><p>O acesso aos módulos ainda está em integração experimental.</p></div>}
 <a href="/">Voltar ao Lingua</a></section></main>;
}
