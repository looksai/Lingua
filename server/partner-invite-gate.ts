export function partnerInviteLabEnabled(env:Record<string,string|undefined>):boolean{
 return env.NODE_ENV!=="production" && env.PARTNER_INVITES_ENABLED==="true" && env.DATABASE_URL==="mysql://partner_lab:partner_lab@127.0.0.1:33316/partner_lab";
}
