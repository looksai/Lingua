import {describe,it,expect} from "vitest";
import {rateLimit} from "./auth-local";

describe("community request throttle budgets",()=>{
 const fixed=1764300000000;
 it("preserves the restrictive default for uncustomized mutations",()=>{
  const key="lab-default-mutation-budget";
  for(let i=0;i<8;i++)expect(()=>rateLimit(key,fixed)).not.toThrow();
  expect(()=>rateLimit(key,fixed)).toThrow();
 });
 it("permits bounded query pagination without relaxing the default",()=>{
  const key="lab-paginated-community-reads";
  for(let i=0;i<40;i++)expect(()=>rateLimit(key,fixed,40)).not.toThrow();
  expect(()=>rateLimit(key,fixed,40)).toThrow();
 });
 it("does not accept unlimited or nonsensical override budgets",()=>{
  expect(()=>rateLimit("lab-unbounded",fixed,501)).toThrow("Invalid rate limit policy");
  expect(()=>rateLimit("lab-zero",fixed,0)).toThrow("Invalid rate limit policy");
  expect(()=>rateLimit("lab-fractional",fixed,1.5)).toThrow("Invalid rate limit policy");
 });
});
