/**
 * An async tutor result may update the chat only while its original
 * conversation/consent scope is still active.
 *
 * This is a UI isolation guard, not server-side cancellation or user attestation.
 */
export function tutorAsyncResultIsCurrent(
  startedInEpoch:number, currentEpoch:number, mounted:boolean,
):boolean {
  return mounted && Number.isSafeInteger(startedInEpoch) &&
    Number.isSafeInteger(currentEpoch) && startedInEpoch===currentEpoch;
}
