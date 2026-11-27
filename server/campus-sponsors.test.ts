import {describe,expect,it} from "vitest";
import {campusSponsors} from "./campus-sponsors";
const now=Date.parse("2026-11-26T00:00:00Z");
const valid={id:"lab-1",sponsor:"Empresa sintética",title:"Serviço sintético",description:"Conteúdo de laboratório",url:"https://example.com/service",startsAt:"2026-11-25T00:00:00Z",endsAt:"2026-11-27T00:00:00Z",approval:"approved_paid"};
const env=(rows:unknown)=>({CAMPUS_SPONSORS_ENABLED:"true",CAMPUS_SPONSORS_JSON:JSON.stringify(rows)});
describe("campus sponsored placement",()=>{
 it("disabled by default",()=>expect(campusSponsors({},now)).toEqual([]));
 it("returns only permitted public metadata",()=>expect(campusSponsors(env([valid]),now)).toEqual([{id:valid.id,sponsor:valid.sponsor,title:valid.title,description:valid.description,url:valid.url}]));
 it.each([{approval:"pending"},{url:"javascript:alert(1)"},{url:"http://example.com"},{url:"https://user:pass@example.com"},{studentEmail:"private@example.com"},{endsAt:"2026-11-25T00:00:00Z"}])("rejects invalid record %j",patch=>expect(campusSponsors(env([{...valid,...patch}]),now)).toEqual([]));
 it("rejects duplicate ids and malformed JSON",()=>{
 expect(campusSponsors(env([valid,valid]),now)).toEqual([]);
 expect(campusSponsors({...env([]),CAMPUS_SPONSORS_JSON:"{"},now)).toEqual([]);
 });
 it("respects campaign window and max three",()=>{
 expect(campusSponsors(env([valid]),Date.parse(valid.endsAt))).toEqual([]);
 expect(campusSponsors(env([valid]),Date.parse(valid.startsAt)-1)).toEqual([]);
 expect(campusSponsors(env(Array.from({length:5},(_,i)=>({...valid,id:"lab-"+i}))),now)).toHaveLength(3);
 });
});
