import {AdminCommunityReports} from "./AdminCommunityReports";
import {AdminCommunityModeration} from "./AdminCommunityModeration";
import {AdminPromotions} from "./AdminPromotions";
import {AdminTrialCoupons} from "./AdminTrialCoupons";
import {AdminFinance} from "./AdminFinance";
import {trpc} from "@/lib/trpc";
import {AdminOverview} from "./AdminOverview";
export default function AdminDashboard(){
 const identity=trpc.auth.me.useQuery(undefined,{retry:false});
 if(identity.isPending)return <main role="status">Confirmando sessão administrativa...</main>;
 if(identity.error||identity.data?.role!=="admin")return <main><h1>Acesso administrativo restrito</h1><a href="/">Voltar ao Lingua</a></main>;
 return <AuthorizedDashboard/>;
}
function AuthorizedDashboard(){
 const metrics=trpc.adminLab.metrics.useQuery(undefined,{retry:false});
 const ads=trpc.adminLab.advertising.useQuery(undefined,{retry:false});
 const referrals=trpc.adminLab.referrals.useQuery(undefined,{retry:false});
 const invitations=trpc.adminLab.academyInviteSummary.useQuery(undefined,{retry:false});
 const m=metrics.data,a=ads.data,r=referrals.data,i=invitations.data;
 return <AdminOverview refresh={()=>{void metrics.refetch();void ads.refetch();void referrals.refetch();void invitations.refetch();}} groups={[
 {title:"Usuários e assinaturas",metrics:[{label:"Contas cadastradas",value:m?.registeredAccounts},{label:"Membros ativos",value:m?.activeMembers},{label:"Pagantes ativos",value:m?.activePaidMembers},{label:"Em teste",value:m?.activeTrialMembers}]},
 {title:"Empresas",metrics:[{label:"Cadastradas",value:m?.companies.total},{label:"Ativas",value:m?.companies.active},{label:"Pendentes",value:m?.companies.pending},{label:"Suspensas",value:m?.companies.suspended}]},
 {title:"Publicidade",metrics:[{label:"Contratações",value:a?.totalOrders},{label:"Pagas",value:a?.paidOrders},{label:"Pagas em veiculação",value:a?.activePaidOrders}]},
 {title:"Indicações",metrics:[{label:"Códigos emitidos",value:r?.codesIssued},{label:"Indicações registradas",value:r?.attributions},{label:"Conversões confirmadas",value:r?.confirmedConversions},{label:"Estornadas",value:r?.reversedConversions}]},
 {title:"Cupons de teste",metrics:[{label:"Emitidos",value:m?.trialCouponsIssued},{label:"Resgatados",value:m?.trialRedemptions}]},
 {title:"Academy Beta · Convites",metrics:[{label:"Convites gerados",value:i?.configured?i.total:undefined},{label:"Convites vigentes",value:i?.configured?i.active:undefined},{label:"Convites expirados",value:i?.configured?i.expired:undefined},{label:"Vagas para novos convites",value:i?.configured?i.availableSlots:undefined}]}
 ]}>{(metrics.isError||ads.isError||referrals.isError||invitations.isError)&&<p role="alert">Alguns indicadores estão indisponíveis. Verifique a configuração administrativa.</p>}<p className="text-sm">Convites são autorizações de cadastro e não representam alunos cadastrados ou assinaturas pagas. O piloto é limitado a 20 convites simultâneos.</p><AdminFinance/><AdminTrialCoupons/><AdminPromotions/><AdminCommunityModeration/><AdminCommunityReports/><a href="/">Voltar ao Lingua</a></AdminOverview>;
}
