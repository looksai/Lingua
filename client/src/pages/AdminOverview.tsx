import type {ReactNode} from "react";
export type AdminMetric={label:string;value:number|undefined};
export function AdminOverview({groups,refresh,children}:{groups:{title:string;metrics:AdminMetric[]}[];refresh:()=>void;children?:ReactNode}){
 return <main className="academy-interior min-h-screen px-5 py-8"><div className="mx-auto max-w-6xl space-y-8">
 <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm uppercase tracking-widest">Lingua · Administração</p><h1 className="font-display text-3xl">Visão executiva</h1><p>Indicadores operacionais e comerciais</p></div><button className="academy-secondary" onClick={refresh}>Atualizar indicadores</button></header>
 {groups.map(group=><section key={group.title} aria-label={group.title}><h2 className="mb-3 text-xl font-semibold">{group.title}</h2><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{group.metrics.map(metric=><article key={metric.label} className="academy-state-card !m-0 !p-4"><p className="text-sm">{metric.label}</p><p className="text-3xl font-semibold tabular-nums">{metric.value===undefined?"—":metric.value.toLocaleString("pt-BR")}</p>{metric.value===undefined&&<p className="text-xs">Dados indisponíveis</p>}</article>)}</div></section>)}
 {children}
 </div></main>;
}
