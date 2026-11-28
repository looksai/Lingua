import type {personalGamificationProfile,GamificationPrivacy} from "../../../shared/gamification-profile";
type Props={
 profile:ReturnType<typeof personalGamificationProfile>;
 privacy:GamificationPrivacy;
 onPrivacyChange?:(next:GamificationPrivacy)=>void;
 preview?:boolean;
};
const preferences=[["showLevel","Exibir meu nível"],["showAchievements","Exibir minhas conquistas"],["leaderboardOptIn","Participar dos rankings"]] as const;
export default function GamificationProfile({profile,privacy,onPrivacyChange,preview=false}:Props){
 const unlocked=profile.achievements.filter(a=>a.unlocked).length;
 return <section aria-label="Progresso acadêmico" className="space-y-6 rounded-2xl border bg-card p-6 text-card-foreground">
 <header><p className="text-sm text-muted-foreground">Meu progresso</p><h2 className="text-2xl font-semibold">Nível {profile.level}</h2>{preview&&<p className="text-sm text-muted-foreground">Prévia de participação — não representa saldo definitivo.</p>}</header>
 <div className="space-y-2"><div className="flex justify-between text-sm"><span>Próximo nível</span><span>{profile.xpIntoLevel} / {profile.xpPerLevel} XP</span></div><progress aria-label="Progresso para o próximo nível" className="h-2 w-full accent-amber-600" value={profile.xpIntoLevel} max={profile.xpPerLevel}/><p className="text-sm text-muted-foreground">{profile.totalXp} XP de participação. XP não certifica proficiência.</p></div>
 <div><h3 className="font-semibold">Conquistas ({unlocked}/{profile.achievements.length})</h3><ul className="mt-3 grid gap-3 sm:grid-cols-2">{profile.achievements.map(a=><li key={a.id} className="rounded-xl border p-3"><p className="font-medium">{a.title}</p><p className="text-sm text-muted-foreground">{a.unlocked?"Desbloqueada":a.progress+" / "+a.threshold}</p><progress aria-label={a.title} className="h-1.5 w-full accent-amber-600" value={a.progress} max={a.threshold}/></li>)}</ul></div>
 <fieldset className="space-y-3" disabled={!onPrivacyChange||preview}><legend className="font-semibold">Privacidade na comunidade</legend>{preferences.map(([key,label])=><label key={key} className="flex items-center justify-between gap-4 text-sm"><span>{label}</span><input type="checkbox" checked={privacy[key]} onChange={e=>onPrivacyChange?.({...privacy,[key]:e.currentTarget.checked})}/></label>)}</fieldset>
 {(!onPrivacyChange||preview)&&<p className="text-xs text-muted-foreground">Preferências indisponíveis nesta prévia.</p>}
 </section>;
}
