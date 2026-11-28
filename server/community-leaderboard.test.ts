import {describe,it,expect} from "vitest";
import {weeklyParticipationRanking,type RankingCandidate} from "../shared/community-leaderboard";
const c=(memberId:number,weeklyXp:number,overrides:Partial<RankingCandidate>={}):RankingCandidate=>({memberId,weeklyXp,active:true,optedIn:true,...overrides});
describe("Weekly participation ranking",()=>{
 it("filters inactive and private members and preserves ties",()=>{
  expect(weeklyParticipationRanking([c(3,100),c(2,200),c(1,200),c(4,300,{optedIn:false}),c(5,400,{active:false})])).toEqual([{memberId:1,weeklyXp:200,rank:1},{memberId:2,weeklyXp:200,rank:1},{memberId:3,weeklyXp:100,rank:3}]);
 });
 it("enforces policy ceiling and bounded output",()=>{
  expect(weeklyParticipationRanking([c(1,5250),c(2,5251),c(3,0),c(4,NaN),c(5,20)],1)).toEqual([{memberId:1,weeklyXp:5250,rank:1}]);
 });
 it("rejects duplicate members and invalid limits",()=>{
  expect(()=>weeklyParticipationRanking([c(1,20),c(1,30)])).toThrow();
  expect(()=>weeklyParticipationRanking([],0)).toThrow();
 });
});
