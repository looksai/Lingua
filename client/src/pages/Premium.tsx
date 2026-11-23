import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

/** Staging-only billing UI. All authority comes from billing.status,
 * never a success URL or data stored by the browser.
 */
export default function Premium({success=false}:{success?:boolean}){
  const status=trpc.billing.status.useQuery(undefined,{
    retry:false,refetchInterval:success?3500:false,refetchOnWindowFocus:true,
  });
  const checkout=trpc.billing.createCheckout.useMutation();
  const portal=trpc.billing.createPortalSession.useMutation();
  const [currency,setCurrency]=useState<"usd"|"brl">("usd");
  const [notice,setNotice]=useState("");
  function attemptId(){
    const key="lingua:billing:checkout-attempt:"+currency;
    let id:string|null=null;
    try{id=window.sessionStorage.getItem(key);}catch{/* storage optional */}
    if(!id || !/^[A-Za-z0-9_-]{12,80}$/.test(id)){
      id=crypto.randomUUID();
      try{window.sessionStorage.setItem(key,id);}catch{/* server still idempotent */}
    }
    return id;
  }
  async function subscribe(){
    setNotice("");
    try{
      const result=await checkout.mutateAsync({currency,attemptId:attemptId()});
      // Backend verifies Stripe-hosted URL; never redirect based on a querystring.
      const u=new URL(result.url);
      if(u.protocol!=="https:"||u.hostname!=="checkout.stripe.com")throw Error("bad checkout redirect");
      window.location.assign(u.toString());
    }catch{setNotice("Checkout indisponível ou já existe um pagamento em andamento. Consulte o seu estado antes de tentar novamente.");}
  }
  async function manage(){
    setNotice("");
    try{
      const result=await portal.mutateAsync();
      const u=new URL(result.url);
      if(u.protocol!=="https:"||u.hostname!=="billing.stripe.com")throw Error("bad portal redirect");
      window.location.assign(u.toString());
    }catch{setNotice("Não foi possível acessar a gestão da assinatura.");}
  }
  return <main className="min-h-screen bg-paper px-6 py-12 text-ink">
    <div className="mx-auto max-w-xl rounded-3xl border border-ink/10 bg-white p-7 shadow-sm">
      <Link href="/" className="text-sm text-teal underline">Voltar para meu espaço</Link>
      <h1 className="mt-6 font-display text-3xl">Lingua Premium</h1>
      {status.isPending&&<p className="mt-3">Verificando sua conta...</p>}
      {status.error&&<p role="alert" className="mt-3">Não foi possível consultar o estado da assinatura. Tente atualizar a página.</p>}
      {status.data&&!status.data.enabled&&<p className="mt-3">A assinatura ainda não está disponível. Os testes de pagamento permanecem desativados.</p>}
      {status.data?.enabled&&<>
        {status.data.access==="premium"?
          <p className="mt-4">Sua assinatura Premium está ativa, conforme confirmação do servidor.</p>:
          <p className="mt-4">{success?"Aguardando a confirmação do pagamento pela Stripe. O retorno ao aplicativo não ativa a assinatura.": "Assinaturas em homologação de testes."}</p>}
        {status.data.access==="trial"&&<p className="mt-3 text-sm">Teste disponível: até {status.data.remainingReplies} respostas com IA restantes, respeitando o prazo de 72 horas a partir da primeira resposta.</p>}
        <p className="mt-5 text-sm">Proposta inicial: US$ 9,90/mês. Valores e meios de pagamento dependem do Checkout da Stripe; não há promessa de uso ilimitado.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" disabled={checkout.isPending} onClick={()=>void subscribe()}
            className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
            {checkout.isPending?"Abrindo Stripe...":"Assinar no Stripe (teste)"}
          </button>
          <button type="button" disabled={portal.isPending} onClick={()=>void manage()}
            className="rounded-full border border-ink/20 px-5 py-3 text-sm disabled:opacity-60">Gerenciar assinatura</button>
        </div>
        {status.data.access==="premium"&&<p className="mt-4 text-sm">A gestão de cancelamento e cartão é feita no portal seguro da Stripe.</p>}
      </>}
      {notice&&<p role="alert" className="mt-4 text-sm text-red-700">{notice}</p>}
    </div>
  </main>;
}
