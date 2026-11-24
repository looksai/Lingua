import {describe,expect,it} from "vitest";
import {SimulatedEvidenceTransactionAdapter} from "./learning-evidence-transaction-adapter-lab";
import {
  LAB_CONSENT_MAX_DURATION_MS,
  type EvidenceLabCommand,type EvidenceLabLedger,
} from "./learning-evidence-lifecycle-lab";
import {
  EVIDENCE_PURPOSE,
  type EvidenceConsentSnapshot,type LearningObservationCandidate,
  type TrustedEvidenceContext,
} from "./learning-evidence-lab";

const USER=41,OTHER=42,START=1_000;
const consent=(userId=USER,now=START,id="consent-1"):EvidenceConsentSnapshot=>({
  userId,consentId:id,purpose:EVIDENCE_PURPOSE,policyVersion:1,
  grantedAtMs:now,expiresAtMs:now+LAB_CONSENT_MAX_DURATION_MS,
  revokedAtMs:null,
});
const candidate=(userId=USER,attemptId="attempt-1"):LearningObservationCandidate=>({
  userId,attemptId,sessionId:"session-1",deliveryId:"delivery-1",
  competencyId:"greeting.hello",competencyVersion:1,
  taskId:"hello.expression",taskVersion:1,contextId:"hello.word.expression",
  stage:"PRATICAR",observedAtMs:2_000,outcome:"meets",assessor:"rule",
  assistance:"model",origin:"client_text_claim",
});
const context=(userId=USER):TrustedEvidenceContext=>({
  authenticatedUserId:userId,nowMs:2_100,currentConsent:consent(userId),
  receipt:{
    userId,sessionId:"session-1",deliveryId:"delivery-1",
    taskId:"hello.expression",taskVersion:1,contextId:"hello.word.expression",
    stage:"PRATICAR",supportShown:"model",renderedAtMs:1_800,
    issuedByServer:true,renderAckRecorded:true,
  },
  authenticatedAttempt:true,
});
const grant=(userId=USER,expectedRevision=0):EvidenceLabCommand=>({
  kind:"grant",userId,expectedRevision,nowMs:START,
  consent:consent(userId),
});
const propose=(userId=USER,expectedRevision=1):EvidenceLabCommand=>({
  kind:"propose",userId,expectedRevision,
  candidate:candidate(userId),context:context(userId),
});
const revoke=(userId=USER,expectedRevision=2):EvidenceLabCommand=>({
  kind:"revoke",userId,expectedRevision,nowMs:3_000,
});
const erase=(userId=USER,expectedRevision=2):EvidenceLabCommand=>({
  kind:"erase",userId,expectedRevision,nowMs:3_000,
});
function deferred(){
  let resolve!:()=>void;
  const promise=new Promise<void>(res=>{resolve=res;});
  return {promise,resolve};
}

describe("In-memory transaction double — not proof of real SQL atomicity",()=>{
  it("serially grants and stores only a provisional projection",async()=>{
    const adapter=new SimulatedEvidenceTransactionAdapter();
    expect((await adapter.execute(USER,grant())).outcome).toBe("applied");
    const out=await adapter.execute(USER,propose());
    expect(out.outcome).toBe("applied");
    expect(adapter.snapshotForTest(USER).revision).toBe(2);
    expect(adapter.snapshotForTest(USER).observations).toHaveLength(1);
    expect(out.state.observations[0]).toMatchObject({
      status:"provisional_unverified",
      officialLearningEvidence:false,mastery:false,
      certification:"not_assessed",
    });
  });

  it("does not read or mutate a different account from a forged command",async()=>{
    const adapter=new SimulatedEvidenceTransactionAdapter();
    await adapter.execute(OTHER,grant(OTHER));
    const original=adapter.snapshotForTest(OTHER);
    const response=await adapter.execute(USER,propose(OTHER));
    expect(response).toMatchObject({outcome:"rejected",reason:"wrong_learner"});
    expect(response.state.userId).toBe(USER);
    expect(adapter.snapshotForTest(OTHER)).toEqual(original);
  });

  it("rejects parallel stale revisions and permits an explicit retry",async()=>{
    const adapter=new SimulatedEvidenceTransactionAdapter();
    await adapter.execute(USER,grant());
    const [a,b]=await Promise.all([
      adapter.execute(USER,propose()),
      adapter.execute(USER,propose()),
    ]);
    expect(a).toMatchObject({outcome:"applied"});
    expect(b).toMatchObject({outcome:"rejected",reason:"stale_revision"});
    expect(adapter.snapshotForTest(USER).observations).toHaveLength(1);
    expect((await adapter.execute(USER,propose(USER,2))).reason).toBe("duplicate_attempt");
  });

  it("releases lock and rolls back when a pre-commit write fails",async()=>{
    const adapter=new SimulatedEvidenceTransactionAdapter();
    await adapter.execute(USER,grant());
    const before=adapter.snapshotForTest(USER);
    await expect(adapter.execute(USER,propose(),phase=>{
      if(phase==="before_commit")throw new Error("simulated disk failure");
    })).rejects.toThrow("simulated disk failure");
    expect(adapter.snapshotForTest(USER)).toEqual(before);
    // The previous exception must not poison the serialized queue.
    expect((await adapter.execute(USER,propose())).outcome).toBe("applied");
  });

  it("also rolls back if reading authoritative state fails",async()=>{
    const adapter=new SimulatedEvidenceTransactionAdapter();
    await expect(adapter.execute(USER,grant(),phase=>{
      if(phase==="after_read")throw new Error("simulated read failure");
    })).rejects.toThrow("simulated read failure");
    expect(adapter.snapshotForTest(USER).revision).toBe(0);
    expect((await adapter.execute(USER,grant())).outcome).toBe("applied");
  });

  it("revoke queued ahead of a stale write wins without resurrection",async()=>{
    const adapter=new SimulatedEvidenceTransactionAdapter();
    await adapter.execute(USER,grant());
    await adapter.execute(USER,propose());
    const entered=deferred(),release=deferred();
    const revocation=adapter.execute(USER,revoke(),async phase=>{
      if(phase==="before_commit"){entered.resolve();await release.promise;}
    });
    await entered.promise;
    const lateWrite=adapter.execute(USER,propose(USER,2));
    release.resolve();
    const [r,late]=await Promise.all([revocation,lateWrite]);
    expect(r.outcome).toBe("applied");
    expect(r.state.observations).toHaveLength(0);
    expect(late.reason).toBe("stale_revision");
    expect(adapter.snapshotForTest(USER).observations).toHaveLength(0);
    const retry=await adapter.execute(USER,propose(USER,3));
    expect(retry.gate?.reason).toBe("consent_revoked");
  });

  it("a write that commits before revoke is purged by subsequent revocation",async()=>{
    const adapter=new SimulatedEvidenceTransactionAdapter();
    await adapter.execute(USER,grant());
    const entered=deferred(),release=deferred();
    const first=adapter.execute(USER,propose(),async phase=>{
      if(phase==="before_commit"){entered.resolve();await release.promise;}
    });
    await entered.promise;
    const outdatedRevoke=adapter.execute(USER,revoke(USER,1));
    release.resolve();
    expect((await first).outcome).toBe("applied");
    expect((await outdatedRevoke).reason).toBe("stale_revision");
    const committed=await adapter.execute(USER,revoke(USER,2));
    expect(committed.outcome).toBe("applied");
    expect(adapter.snapshotForTest(USER).observations).toEqual([]);
  });

  it("a failing erase does not partially clear the record; successful retry does",async()=>{
    const adapter=new SimulatedEvidenceTransactionAdapter();
    await adapter.execute(USER,grant());
    await adapter.execute(USER,propose());
    const before=adapter.snapshotForTest(USER);
    await expect(adapter.execute(USER,erase(),phase=>{
      if(phase==="before_commit")throw new Error("erase interrupted");
    })).rejects.toThrow("erase interrupted");
    expect(adapter.snapshotForTest(USER)).toEqual(before);
    const cleared=await adapter.execute(USER,erase());
    expect(cleared.outcome).toBe("applied");
    expect(cleared.state.consent).toBeNull();
    expect(cleared.state.observations).toEqual([]);
    expect((await adapter.execute(USER,propose(USER,3))).gate?.reason)
      .toBe("consent_missing");
  });

  it("an operation on another account completes while this account is blocked",async()=>{
    const adapter=new SimulatedEvidenceTransactionAdapter();
    const entered=deferred(),release=deferred();
    const slow=adapter.execute(USER,grant(),async phase=>{
      if(phase==="before_commit"){entered.resolve();await release.promise;}
    });
    await entered.promise;
    const different=await adapter.execute(OTHER,grant(OTHER));
    expect(different.outcome).toBe("applied");
    expect(adapter.snapshotForTest(USER).revision).toBe(0);
    release.resolve();
    expect((await slow).outcome).toBe("applied");
  });

  it("returns copies; caller mutations cannot corrupt the stored ledger",async()=>{
    const adapter=new SimulatedEvidenceTransactionAdapter();
    const first=await adapter.execute(USER,grant());
    (first.state as {revision:number}).revision=999;
    const read=adapter.snapshotForTest(USER);
    (read.consent as {consentId:string}).consentId="tampered";
    expect(adapter.snapshotForTest(USER).revision).toBe(1);
    expect(adapter.snapshotForTest(USER).consent?.consentId).toBe("consent-1");
  });

  it("never trusts the command's alleged consent instead of committed consent",async()=>{
    const adapter=new SimulatedEvidenceTransactionAdapter();
    // Match the empty ledger's revision so the missing-consent gate is exercised.
    const request=propose(USER,0);
    if(request.kind!=="propose")throw Error("unexpected");
    const answer=await adapter.execute(USER,{
      ...request,context:{...request.context,currentConsent:consent()},
    });
    expect(answer.gate?.reason).toBe("consent_missing");
    expect(adapter.snapshotForTest(USER).observations).toHaveLength(0);
  });

  it("does not mutate a ledger on invalid principal, invalid revision or replay",async()=>{
    const adapter=new SimulatedEvidenceTransactionAdapter();
    await expect(adapter.execute(0,grant())).rejects.toThrow();
    await adapter.execute(USER,grant());
    const state=adapter.snapshotForTest(USER);
    const rejected=await adapter.execute(USER,propose(USER,0));
    expect(rejected.reason).toBe("stale_revision");
    expect(adapter.snapshotForTest(USER)).toEqual(state);
  });

  it("rejects an in-flight AI result when revocation commits during generation",async()=>{
    const adapter=new SimulatedEvidenceTransactionAdapter();
    await adapter.execute(USER,grant());
    const generationStarted=deferred(),finishGeneration=deferred();
    const delayedGeneration=(async()=>{
      // Capture the consent revision BEFORE awaiting a simulated model response.
      const initial=adapter.snapshotForTest(USER);
      generationStarted.resolve();
      await finishGeneration.promise;
      // A generated result must pass the server-side transaction gate again.
      return adapter.execute(USER,propose(USER,initial.revision));
    })();
    await generationStarted.promise;
    const revoked=await adapter.execute(USER,revoke(USER,1));
    expect(revoked.outcome).toBe("applied");
    expect(revoked.state.consent?.revokedAtMs).toBe(3_000);
    finishGeneration.resolve();
    const late=await delayedGeneration;
    expect(late).toMatchObject({outcome:"rejected",reason:"stale_revision"});
    expect(adapter.snapshotForTest(USER).observations).toEqual([]);
  });

  it("does not attach a response from an old consent epoch to a later re-grant",async()=>{
    const adapter=new SimulatedEvidenceTransactionAdapter();
    await adapter.execute(USER,grant());
    const oldEpochRevision=adapter.snapshotForTest(USER).revision;
    expect((await adapter.execute(USER,revoke(USER,1))).outcome).toBe("applied");
    const newConsent=consent(USER,4_000,"consent-2");
    const renewed=await adapter.execute(USER,{
      kind:"grant",userId:USER,expectedRevision:2,nowMs:4_000,
      consent:newConsent,
    });
    expect(renewed.outcome).toBe("applied");
    // Old in-flight model output is not valid merely because consent is now true.
    const oldResult=await adapter.execute(USER,propose(USER,oldEpochRevision));
    expect(oldResult).toMatchObject({outcome:"rejected",reason:"stale_revision"});
    expect(adapter.snapshotForTest(USER).consent?.consentId).toBe("consent-2");
    expect(adapter.snapshotForTest(USER).observations).toEqual([]);
  });
});
