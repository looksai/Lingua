import {describe,expect,it} from "vitest";
import {tutorAsyncResultIsCurrent} from "./tutor-async-epoch";
describe("tutor async conversation isolation",()=>{
  it("accepts a response only for the current mounted conversation",()=>{
    expect(tutorAsyncResultIsCurrent(4,4,true)).toBe(true);
  });
  it("drops a reply after switching account or provider",()=>{
    expect(tutorAsyncResultIsCurrent(4,5,true)).toBe(false);
  });
  it("drops late ASR text after consent revocation or chat erasure",()=>{
    expect(tutorAsyncResultIsCurrent(8,9,true)).toBe(false);
  });
  it("drops late audio after unmount even if the epoch matches",()=>{
    expect(tutorAsyncResultIsCurrent(5,5,false)).toBe(false);
  });
  it("never allows an invalid or fabricated epoch to apply",()=>{
    for(const value of [NaN,Infinity,-Infinity,1.5]){
      expect(tutorAsyncResultIsCurrent(value,value,true)).toBe(false);
    }
  });
  it("does not trust results from future epochs",()=>{
    expect(tutorAsyncResultIsCurrent(12,11,true)).toBe(false);
  });
});
