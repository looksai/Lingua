/**
 * TRANSACTION ADAPTER CONTRACT — IN-MEMORY TEST DOUBLE ONLY.
 *
 * This test double simulates serial transactions on ONE server process.
 * It provides no MySQL locks, durability, backup deletion, or authentication.
 * Never instantiate in a production router. There is no DB, migration or IO.
 *
 * A future DB implementation must lock both the user's consent and observation
 * index, verify the authenticated principal, obtain authoritative server time,
 * and re-run the gate inside ONE transaction with a unique attempt key.
 */
import {
  emptyEvidenceLabLedger,stepEvidenceLab,
  type EvidenceLabCommand,type EvidenceLabLedger,
  type EvidenceLabResult,
} from "./learning-evidence-lifecycle-lab";

export type TransactionProbePhase="after_read"|"before_commit";
export type TransactionProbe=(phase:TransactionProbePhase,
  state:EvidenceLabLedger)=>void|Promise<void>;

const validUserId=(id:number)=>Number.isSafeInteger(id)&&id>0;
const clone=<T>(value:T):T=>structuredClone(value);

/**
 * Serialize operations by authenticated learner ID; two learners have separate
 * queues. The caller controls the purported identity in tests — this does not
 * authenticate HTTP callers.
 */
export class SimulatedEvidenceTransactionAdapter {
  private readonly ledgers=new Map<number,EvidenceLabLedger>();
  private readonly queues=new Map<number,Promise<void>>();

  /** TEST ONLY. Detached snapshot cannot mutate the stored ledger. */
  snapshotForTest(userId:number):EvidenceLabLedger {
    if(!validUserId(userId))throw new Error("Invalid learner ID");
    return clone(this.ledgers.get(userId)??emptyEvidenceLabLedger(userId));
  }

  async execute(
    authenticatedUserId:number,
    command:EvidenceLabCommand,
    probe?:TransactionProbe,
  ):Promise<EvidenceLabResult> {
    if(!validUserId(authenticatedUserId))throw new Error("Invalid learner ID");
    // Do not even read/lock the target user named in a forged command.
    if(command.userId!==authenticatedUserId){
      const state=this.snapshotForTest(authenticatedUserId);
      return {state,outcome:"rejected",reason:"wrong_learner",gate:null};
    }

    const previous=this.queues.get(authenticatedUserId)??Promise.resolve();
    let release!:()=>void;
    const done=new Promise<void>(resolve=>{release=resolve;});
    const queued=previous.then(()=>done);
    this.queues.set(authenticatedUserId,queued);
    await previous;

    try {
      const prior=this.ledgers.get(authenticatedUserId)??
        emptyEvidenceLabLedger(authenticatedUserId);
      if(probe)await probe("after_read",clone(prior));

      // The pure gate is run AFTER acquiring the simulated lock. A future DB
      // adapter must load consent fresh here, not trust context.currentConsent.
      const evaluated=stepEvidenceLab(prior,command);
      if(evaluated.outcome==="applied"){
        if(probe)await probe("before_commit",clone(evaluated.state));
        // No mutation is made before all pre-commit steps complete. If any
        // probe throws, finally releases the lock and stored state is untouched.
        this.ledgers.set(authenticatedUserId,clone(evaluated.state));
      }
      return clone(evaluated);
    } finally {
      release();
      if(this.queues.get(authenticatedUserId)===queued)
        this.queues.delete(authenticatedUserId);
    }
  }
}
