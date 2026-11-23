import type {TutorHistory} from "../shared/tutor";

/**
 * Conservative backstop for first-person learner biographies in AI replies.
 * Only user-authored turns are evidence; tutor replies and general onboarding
 * interests never prove certificates, licences, or years of experience.
 *
 * This does NOT replace model QA: it targets a known class of false claims,
 * not every possible unsupported statement.
 */
const CERTIFICATION_CLAIM =
  /\b(?:i\s+(?:am|'m|’m)\s+(?:(?:an?|the)\s+)?(?:[\p{L}-]+\s+){0,4}?(?:certified|licensed|accredited)\b|i\s+(?:have|'ve|’ve)\s+(?:(?:an?|the)\s+)?(?:certification|license|licence)\b|(?:eu\s+)?sou\s+(?:(?:um|uma)\s+)?(?:[\p{L}-]+\s+){0,4}?(?:certificad[oa]|licenciad[oa])\b|(?:eu\s+)?(?:tenho|possuo)\s+(?:(?:um|uma)\s+)?(?:certificado|certifica[cç][aã]o|licen[cç]a)\b)/iu;

const EXPERIENCE_CLAIM_EN =
  /\bi\s+(?:am|'m|’m|have|'ve|’ve|have\s+been|have\s+worked)\b[^.!?\n]{0,140}?\b(\d{1,2})\s+years?\s+(?:of\s+experience|experience|working\b|as\s+\w+|in\s+\w+)/giu;
const EXPERIENCE_CLAIM_PT =
  /\b(?:eu\s+)?(?:tenho|trabalho|atuo|sou)\b[^.!?\n]{0,120}?\b(\d{1,2})\s+anos?\s+(?:de\s+experi[eê]ncia|na\s+área|como\s+\w+)/giu;

function statedCredentials(text:string){
  return /(?:^|[.!?\n]\s*)\s*(?:eu\s+)?(?:sou|tenho|possuo)\s+[^.!?\n]{0,70}?(?:certificad[oa]|certificado|certifica[cç][aã]o|licenciad[oa]|licen[cç]a)\b/imu.test(text)
    || /(?:^|[.!?\n]\s*)\s*i\s+(?:am|'m|’m|have|'ve|’ve)\s+[^.!?\n]{0,70}?(?:certified|licensed|accredited|certification|licen[sc]e)\b/imu.test(text);
}
function explicitlyStatedYears(text:string){
  const years=new Set<number>();
  const patterns=[
    /\b(?:eu\s+)?tenho\s+(\d{1,2})\s+anos?\s+de\s+experi[eê]ncia\b/giu,
    /\b(?:eu\s+)?(?:trabalho|atuo|sou\s+(?:um\s+|uma\s+)?[\p{L}-]+)\s+h[aá]\s+(\d{1,2})\s+anos?\b/giu,
    /\bi\s+(?:have|'ve|’ve)\s+(\d{1,2})\s+years?\s+(?:of\s+)?experience\b/giu,
    /\bi\s+(?:have\s+been|have\s+worked|'ve\s+been|’ve\s+been)\b[^.!?\n]{0,70}?\bfor\s+(\d{1,2})\s+years?\b/giu
  ];
  for(const pattern of patterns)for(const found of text.matchAll(pattern))years.add(Number(found[1]));
  return years;
}
const SAFE_REPLY="Vamos praticar sua apresentação sem presumir certificações ou anos de experiência. Uma opção é: **I work in [your field].** (Eu trabalho na área de [sua área].) Qual profissão, certificação e tempo de experiência você gostaria de informar?";

export function guardTutorLearnerClaims(
  tutorText:string,history:readonly TutorHistory[],currentUserMessage:string
):{text:string;blocked:boolean}{
  const evidence=[...history.filter(x=>x.role==="user").map(x=>x.text),currentUserMessage].join("\n");
  const inventedCredential=CERTIFICATION_CLAIM.test(tutorText)&&!statedCredentials(evidence);
  const knownYears=explicitlyStatedYears(evidence);
  const claimedYears=[
    ...[...tutorText.matchAll(EXPERIENCE_CLAIM_EN)].map(x=>Number(x[1])),
    ...[...tutorText.matchAll(EXPERIENCE_CLAIM_PT)].map(x=>Number(x[1]))
  ];
  const inventedYears=claimedYears.some(year=>!knownYears.has(year));
  if(inventedCredential||inventedYears)return {text:SAFE_REPLY,blocked:true};
  return {text:tutorText,blocked:false};
}
