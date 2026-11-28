import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PRIVATE_GAMIFICATION, type GamificationPrivacy } from "@shared/gamification-profile";

const labels = {
  showLevel: "Mostrar meu nível de participação",
  showAchievements: "Permitir a exibição das minhas conquistas",
  leaderboardOptIn: "Participar do ranking semanal",
} satisfies Record<keyof GamificationPrivacy, string>;

export default function CommunityPrivacy({accountId}:{accountId:number}) {
  const [blocksOpen,setBlocksOpen]=useState(false);
  const query = trpc.commercialLab.communityPreferences.useQuery({accountId}, { retry:false });
  return <main className="academy-interior px-5 py-8"><section className="academy-state-card">
    <h1 className="font-display text-3xl">Privacidade da comunidade</h1>
    {query.isPending ? <p role="status">Carregando preferências...</p> :
      query.error || !query.data ? <p role="alert">Não foi possível carregar suas preferências. <button onClick={()=>void query.refetch()}>Tentar novamente</button></p> :
      <Preferences key={JSON.stringify(query.data)} accountId={accountId} member={query.data.member} initial={query.data.preferences}/>}
    <details onToggle={event=>setBlocksOpen(event.currentTarget.open)}>
      <summary>Meus bloqueios</summary>
      {blocksOpen && <BlockedMembers accountId={accountId}/>}
    </details>
    <a href="/">Voltar ao Lingua</a>
  </section></main>;
}

function Preferences({accountId,member,initial}:{accountId:number;member:boolean;initial:GamificationPrivacy}) {
  const [draft,setDraft] = useState(initial);
  const utils = trpc.useUtils();
  const save = trpc.commercialLab.saveCommunityPreferences.useMutation({
    onSuccess:()=>utils.commercialLab.communityPreferences.invalidate(),
  });
  return <form className="my-5 grid gap-3" onSubmit={event=>{
    event.preventDefault();
    if(!save.isPending) save.mutate({accountId,...(member ? draft : PRIVATE_GAMIFICATION)});
  }}>
    {member ? <p>Escolha o que deseja compartilhar. Desativar a exibição de conquistas também retira as conquistas que você já compartilhou.</p> :
      <p>Sem acesso ativo à comunidade. Você pode retirar todas as permissões de exibição.</p>}
    <fieldset className="grid gap-2" disabled={!member || save.isPending}>
      {(Object.keys(labels) as (keyof GamificationPrivacy)[]).map(key=>
        <label key={key}><input type="checkbox" checked={draft[key]} onChange={e=>{
          save.reset();
          setDraft({...draft,[key]:e.target.checked});
        }}/> {labels[key]}</label>)}
    </fieldset>
    <button className="academy-primary" disabled={save.isPending}>{member ? "Salvar preferências" : "Tornar tudo privado"}</button>
    {save.error && <p role="alert">Não foi possível salvar as preferências.</p>}
    {save.isSuccess && <p role="status">Preferências salvas.</p>}
  </form>;
}

function BlockedMembers({accountId}:{accountId:number}){
  const [afterId,setAfterId]=useState<number>();
  const [notice,setNotice]=useState("");
  const utils=trpc.useUtils();
  const blocks=trpc.commercialLab.blockedMembers.useQuery({accountId,afterId},{retry:false});
  const remove=trpc.commercialLab.setCommunityBlock.useMutation({
    onSuccess:async()=>{
      await utils.commercialLab.blockedMembers.invalidate();
      setNotice("Seu bloqueio foi removido.");
    },
  });
  if(blocks.isPending)return <p role="status">Consultando bloqueios...</p>;
  if(blocks.isError)return <p role="alert">Não foi possível consultar a lista. <button onClick={()=>void blocks.refetch()}>Tentar novamente</button></p>;
  return <div className="my-4 grid gap-2">
    {blocks.data.members.length===0 && <p>{afterId?"Fim da lista.":"Você não bloqueou nenhum membro."}</p>}
    {blocks.data.members.map(({memberId})=><div key={memberId} className="flex items-center justify-between gap-2">
      <span>Membro #{memberId}</span>
      <button disabled={remove.isPending} aria-label={`Desbloquear membro ${memberId}`} onClick={()=>{
        if(!window.confirm(`Remover seu bloqueio do membro #${memberId}?`))return;
        setNotice("");remove.mutate({accountId,targetId:memberId,blocked:false});
      }}>Desbloquear</button>
    </div>)}
    {blocks.data.next!==null && <button onClick={()=>setAfterId(blocks.data.next!)}>Próximos bloqueios</button>}
    {afterId!==undefined && <button onClick={()=>setAfterId(undefined)}>Voltar ao início da lista</button>}
    {remove.error && <p role="alert">Não foi possível remover o bloqueio.</p>}
    {notice && <p role="status">{notice}</p>}
  </div>;
}
