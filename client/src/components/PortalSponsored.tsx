import {Link} from "wouter";
import {trpc} from "@/lib/trpc";
export default function PortalSponsored({placement}:{placement:"portal-home"|"portal-partners"}){
  const result=trpc.ads.placement.useQuery({placement},{retry:false});
  if(!result.data?.length)return null;
  return <section aria-label="Publicidade" className="mx-auto max-w-6xl px-5 py-8">
    <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#526478]">Conteúdo patrocinado</h2>
    <div className="grid gap-4 md:grid-cols-3">
      {result.data.map(ad=><article key={ad.id} className="rounded-2xl border border-[#D3B17B] bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-[#956A39]">Patrocinado · {ad.company}</p>
        <h3 className="mt-3 font-display text-2xl text-[#14283D]">{ad.title}</h3>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#526478]">{ad.body}</p>
        <Link href={ad.destinationUrl} className="mt-4 inline-block text-sm font-semibold text-[#956A39] underline">
          Conhecer a organização
        </Link>
      </article>)}
    </div>
    <p className="mt-3 text-xs text-[#526478]">Publicidade paga não constitui recomendação do Lingua nem orientação jurídica ou migratória.</p>
  </section>;
}
