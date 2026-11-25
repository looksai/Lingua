import {describe,it,expect} from "vitest";
import {LiveInviteStoreLab} from "./partner-live-invite-store-lab";
import type {StoredLiveInvite} from "./partner-live-invite-service";
const record:StoredLiveInvite={digest:"a".repeat(64),eventId:"e1",partnerId:"p1",revokedAt:null,expiresAt:null};
describe("live invite storage laboratory",()=>{
 it("rejects duplicates and preserves original ownership",()=>{
  const store=new LiveInviteStoreLab();
  expect(store.insert(record)).toBe(true);
  expect(store.insert({...record,partnerId:"p2"})).toBe(false);
  expect(store.find(record.digest)).toEqual(record);
 });
 it("copies records on insertion and retrieval",()=>{
  const store=new LiveInviteStoreLab();
  const input={...record};
  store.insert(input);
  input.partnerId="p2";
  const output=store.find(record.digest)!;
  expect(output.partnerId).toBe("p1");
  expect(store.find(record.digest)).not.toBe(output);
 });
 it("conditionally revokes and preserves first timestamp",()=>{
  const store=new LiveInviteStoreLab();
  store.insert(record);
  expect(store.revoke(record.digest,"p2","e1",10)).toBe(false);
  expect(store.revoke(record.digest,"p1","e2",10)).toBe(false);
  expect(store.revoke(record.digest,"p1","e1",NaN)).toBe(false);
  expect(store.revoke(record.digest,"p1","e1",10)).toBe(true);
  expect(store.revoke(record.digest,"p1","e1",20)).toBe(true);
  expect(store.find(record.digest)?.revokedAt).toBe(10);
 });
 it("fails closed at capacity and rejects malformed digests",()=>{
  const store=new LiveInviteStoreLab(1);
  expect(store.insert({...record,digest:"invalid"})).toBe(false);
  expect(store.insert(record)).toBe(true);
  expect(store.insert({...record,digest:"b".repeat(64)})).toBe(false);
  expect(store.find("b".repeat(64))).toBeNull();
  expect(()=>new LiveInviteStoreLab(0)).toThrow();
 });
});
