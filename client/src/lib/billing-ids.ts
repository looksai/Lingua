/** Stable retry key for a Stripe checkout attempt, scoped to a browser session.
 * The server makes this idempotent per authenticated account.
 */
export function billingCheckoutAttemptId(currency:"usd"|"brl"="usd"):string{
  const key="lingua:billing:checkout-attempt:"+currency;
  let id:string|null=null;
  try{id=window.sessionStorage.getItem(key);}catch{/* optional storage */}
  if(!id || !/^[A-Za-z0-9_-]{12,80}$/.test(id)){
    id=crypto.randomUUID();
    try{window.sessionStorage.setItem(key,id);}catch{/* no client storage */}
  }
  return id;
}
export function nextTutorInteractionId():string{
  return crypto.randomUUID();
}
