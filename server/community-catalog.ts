import {evaluateCommunityAccess,type CommunityEntitlement,type CommunityAccess} from "./community-access";

export type CommunityGroup = {
  id: string;
  title: string;
  description: string;
};

const groups: readonly Readonly<CommunityGroup>[] = Object.freeze([
  Object.freeze({id:"immigration",title:"Imigração",description:"Preparação linguística e troca de experiências sobre projetos de mudança internacional."}),
  Object.freeze({id:"career",title:"Carreira internacional",description:"Inglês para entrevistas, ambiente profissional e desenvolvimento de carreira."}),
  Object.freeze({id:"travel",title:"Viagens",description:"Prática de comunicação em situações de viagem."}),
  Object.freeze({id:"ielts",title:"IELTS",description:"Organização de estudos e prática para o exame, sem promessa de pontuação."}),
  Object.freeze({id:"express-entry",title:"Express Entry",description:"Preparação de idioma e troca de experiências, sem consultoria migratória oficial."}),
]);

type Denied = Extract<CommunityAccess,{allowed:false}>;
export type CommunityCatalogResult = Denied | {allowed:true;groups:CommunityGroup[]};

/**
 * Internal server service; not a public endpoint. The injected lookup must
 * originate from a trusted billing adapter, not client input. Missing or
 * failed lookup denies access. No member identities or posts are returned.
 */
export async function readCommunityCatalog(
  input:{featureEnabled:boolean;authenticatedUserId:number|null},
  dependencies:{
    lookupEntitlement:(authenticatedUserId:number)=>Promise<CommunityEntitlement|null>;
    now:()=>number;
  },
):Promise<CommunityCatalogResult>{
  const preliminary = evaluateCommunityAccess({...input,entitlement:null,nowMs:0});
  if (!preliminary.allowed && preliminary.reason !== "subscription_required") return preliminary;
  let entitlement: CommunityEntitlement|null;
  try{
    entitlement = await dependencies.lookupEntitlement(input.authenticatedUserId!);
    const decision = evaluateCommunityAccess({...input,entitlement,nowMs:dependencies.now()});
    if (!decision.allowed) return decision;
  }catch{
    return {allowed:false,reason:"subscription_required"};
  }
  return {allowed:true,groups:groups.map(group=>({...group}))};
}
