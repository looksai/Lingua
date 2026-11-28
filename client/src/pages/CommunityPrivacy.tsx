import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PRIVATE_GAMIFICATION, type GamificationPrivacy } from "@shared/gamification-profile";

const labels = {
  showLevel: "Mostrar meu nível de participação",
  showAchievements: "Permitir a exibição das minhas conquistas",
  leaderboardOptIn: "Participar do ranking semanal",
} satisfies Record<keyof GamificationPrivacy, string>;

export default function CommunityPrivacy({accountId}:{accountId:number}) {
  const query = trpc.commercialLab.communityPreferences.useQuery({accountId}, { retry:false });
  return <main className="academy-interior px-5 py-8"><section className="academy-state-card">
    <h1 className="font-display text-3xl">Privacidade da comunidade</h1>
    {query.isPending ? <p role="status">Carregando preferências...</p> :
      query.error || !query.data ? <p role="alert">Não foi possível carregar suas preferências. <button onClick={()=>void query.refetch()}>Tentar novamente</button></p> :
      <Preferences key={JSON.stringify(query.data)} accountId={accountId} member={query.data.member} initial={query.data.preferences}/>}
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
