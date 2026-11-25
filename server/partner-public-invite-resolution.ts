import {and,eq} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {partnersDraft as partners,partnerEventsDraft as events,partnerLiveInvitesDraft as invites} from "../drizzle/partner-foundation-draft";
import {digestLiveInviteToken} from "./partner-live-invite-token";
import {resolveLiveInvite} from "./partner-live-invite-service";
// Single statement snapshot; not a durable streaming authorization.
export async function resolvePublicPartnerInvite(db:MySql2Database,token:string){
 const digest=digestLiveInviteToken(token);
 if(!digest)return null;
 const [row]=await db.select({partner:partners,event:events,invite:invites}).from(invites)
 .innerJoin(events,and(eq(events.id,invites.eventId),eq(events.partnerId,invites.partnerId)))
 .innerJoin(partners,eq(partners.id,events.partnerId))
 .where(and(eq(invites.digest,digest),eq(partners.status,"active"))).limit(1);
 if(!row)return null;
 const {event,invite}=row;
 const result=resolveLiveInvite(token,{id:String(event.id),partnerId:String(event.partnerId),visibility:event.visibility,status:event.status},{digest:invite.digest,eventId:String(invite.eventId),partnerId:String(invite.partnerId),revokedAt:invite.revokedAt?.getTime()??null,expiresAt:invite.expiresAt?.getTime()??null},Date.now());
 if(!result)return null;
 return {title:event.title,partnerName:row.partner.name,scheduledAt:event.scheduledAt.toISOString(),canWatch:result.canWatch};
}
