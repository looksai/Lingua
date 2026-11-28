import {describe,it,expect} from "vitest";
import {communityReputation,type HelpfulEvidence} from "../shared/community-reputation";
const e=(overrides:Partial<HelpfulEvidence>={}):HelpfulEvidence=>({contributionId:"a",authorId:1,reviewerId:2,acceptedAtMs:0,active:true,...overrides});
describe("Community reputation",()=>{
 it("ignores self recognition, inactive evidence and unrelated owners",()=>{
  expect(communityReputation(1,[e({reviewerId:1}),e({active:false}),e({authorId:3}),e()])).toEqual({helpfulRecognitions:1,distinctReviewers:1});
 });
 it("deduplicates and caps each reviewer per UTC day",()=>{
  const entries=Array.from({length:10},(_,i)=>e({contributionId:String(i)}));
  expect(communityReputation(1,[...entries,...entries,e({reviewerId:3}),e({contributionId:"next",acceptedAtMs:86400000})])).toEqual({helpfulRecognitions:5,distinctReviewers:2});
 });
 it("rejects invalid owner and ignores invalid evidence",()=>{
  expect(()=>communityReputation(0,[])).toThrow();
  expect(communityReputation(1,[e({reviewerId:0}),e({acceptedAtMs:NaN}),e({contributionId:" "})])).toEqual({helpfulRecognitions:0,distinctReviewers:0});
 });
});
