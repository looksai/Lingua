import { ArrowRight, BookOpen, BriefcaseBusiness, GraduationCap, Plane, Laptop, MessageSquare, ListChecks, Target, Compass, Sparkles, Sprout, ChartNoAxesColumnIncreasing, Star } from "lucide-react";
import "./academy-study.css";

type Props = {
  tutorName:string; planTitle:string; objective:string; responses:number;
  savedCount:number|null; placementReady:boolean; canStartPlacement:boolean;
  onRead:()=>void; onReview:()=>void; onTutor:()=>void; onPlan:()=>void; onPlacement:()=>void;
  onUnavailable:(label:string)=>void;
};
const levels=[
 {name:"Iniciante",range:"A1–A2",description:"Construa sua base para situações do dia a dia.",Icon:Sprout},
 {name:"Intermediário",range:"B1–B2",description:"Amplie sua autonomia e confiança.",Icon:ChartNoAxesColumnIncreasing},
 {name:"Avançado",range:"C1–C2",description:"Explore contextos profissionais e acadêmicos complexos.",Icon:Star}
];
const paths=[
 {name:"Inglês Profissional",description:"Comunicação, reuniões e entrevistas.",art:"professional",Icon:BriefcaseBusiness},
 {name:"Inglês Acadêmico",description:"Universidades, estudos e pesquisas.",art:"academic",Icon:GraduationCap},
 {name:"Inglês para Viagens",description:"Comunicação em situações internacionais.",art:"travel",Icon:Plane},
 {name:"Inglês em Tecnologia",description:"Vocabulário e comunicação no trabalho.",art:"technology",Icon:Laptop}
];
export default function StudyCampus(p:Props){
 return <div className="academy-study">
  <section className="study-hero"><div><p className="study-kicker">LINGUA · SEU ESPAÇO DE APRENDIZAGEM</p><h1>Estudar</h1><span className="study-gold-line"/><p>Evolua no seu inglês com caminhos personalizados, prática real e o apoio de {p.tutorName}, seu tutor de IA.</p></div></section>
  <div className="study-top-grid">
   <section aria-labelledby="study-path-title"><div className="study-heading"><Compass size={26}/><div><h2 id="study-path-title" tabIndex={-1}>Sua trilha de inglês</h2><p>Conheça os níveis de referência. Seu percurso é individual.</p></div><button className="study-link" onClick={p.onPlan}>Meu plano <ArrowRight size={15}/></button></div>
    <div className="study-levels">{levels.map(({name,range,description,Icon})=><article key={range}><Icon size={25}/><div><h3>{name} <small>({range})</small></h3><p>{description}</p></div></article>)}</div>
    <p className="study-note">Níveis de referência CEFR; nenhuma classificação de proficiência é atribuída nesta tela.</p>
   </section>
   <section className="study-progress" aria-labelledby="study-progress-title"><div className="study-heading"><Target size={24}/><h2 id="study-progress-title" tabIndex={-1}>Meu progresso</h2></div><div className="study-metrics"><div><strong>{Math.min(p.responses,5)}/5</strong><span>Respostas iniciais</span></div><div><strong>{p.savedCount===null?"—":p.savedCount}</strong><span>Itens salvos*</span></div></div><progress max={5} value={Math.min(p.responses,5)} aria-label="Respostas iniciais registradas"/><p className="study-note">*Até 100 itens carregados. Não representa nível de domínio.</p></section>
  </div>
  <section aria-labelledby="study-specializations"><div className="study-heading"><GraduationCap size={26}/><div><h2 id="study-specializations">Trilhas de especialização</h2><p>Inglês aplicado aos seus objetivos reais.</p></div></div><div className="study-specializations">{paths.map(({name,description,art,Icon})=><button type="button" className={"study-specialization study-art-"+art} key={art} onClick={()=>p.onUnavailable(name)}><div><Icon size={22}/><h3>{name}</h3><p>{description}</p><small>Em preparação</small></div></button>)}</div></section>
  <div className="study-bottom-grid">
   <section><div className="study-heading"><Sparkles size={25}/><div><h2 id="study-plan-title" tabIndex={-1}>Seu próximo passo</h2><p>De acordo com seu plano atual.</p></div></div><article className="study-recommendation"><div className="study-recommendation-art" aria-hidden="true"/><div><p className="study-kicker">{p.placementReady?"PLANO PROVISÓRIO":"PLANO EXPLORATÓRIO"}</p><h3>{p.planTitle}</h3><p>{p.objective}</p><button className="academy-primary" onClick={p.canStartPlacement?p.onPlacement:p.onTutor}>{p.canStartPlacement?"Descobrir por onde começar":"Conversar com meu tutor"} <ArrowRight size={16}/></button></div></article></section>
   <section><div className="study-heading"><BookOpen size={25}/><div><h2>Continue estudando</h2><p>Ferramentas disponíveis agora.</p></div></div><div className="study-actions"><button onClick={p.onTutor}><MessageSquare size={21}/><span><strong>Conversação com {p.tutorName}</strong><small>Pratique e esclareça dúvidas.</small></span><ArrowRight size={17}/></button><button onClick={p.onRead}><BookOpen size={21}/><span><strong>Leitura e vocabulário</strong><small>Explore textos e salve palavras.</small></span><ArrowRight size={17}/></button><button onClick={p.onReview}><ListChecks size={21}/><span><strong>Revisões espaçadas</strong><small>Retome os itens salvos.</small></span><ArrowRight size={17}/></button></div></section>
  </div>
 </div>;
}
