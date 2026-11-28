export function referralCommissionMinor(netEligibleMinor:number,basisPoints:number){
 if(!Number.isSafeInteger(netEligibleMinor)||netEligibleMinor<0||!Number.isInteger(basisPoints)||basisPoints<0||basisPoints>10000)throw Error("Invalid commission");
 return Number(BigInt(netEligibleMinor)*BigInt(basisPoints)/10000n);
}
