import {chmod,mkdtemp,readFile,rm,symlink,stat,unlink,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {describe,expect,it,vi} from "vitest";
import {main} from "../scripts/academy-beta-invites";

describe("local pilot invitation CLI",()=>{
 it("writes only hashed invitations with restrictive permissions, supports audit and revoke",async()=>{
  const folder=await mkdtemp(join(tmpdir(),"lingua-beta-operator-"));
  const file=join(folder,"pilot-invitations.json");
  const output:string[]=[];
  const stdout=vi.spyOn(process.stdout,"write").mockImplementation((chunk:any)=>{
   output.push(String(chunk));return true;
  });
  const stderr=vi.spyOn(process.stderr,"write").mockImplementation(()=>true);
  try{
   await main(["issue",file,"learner@example.test","3"]);
   const code=output.join("").match(/INVITE_CODE=([A-Za-z0-9_-]{43})/)?.[1];
   expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);
   const fileContents=await readFile(file,"utf8");
   expect(fileContents).not.toContain(code!);
   expect(fileContents).toContain("tokenHash");
   expect((await stat(file)).mode&0o777).toBe(0o600);
   output.length=0;
   await main(["audit",file]);
   expect(JSON.parse(output.join(""))).toMatchObject({total:1,active:1,expired:0,availableSlots:19});
   await main(["revoke",file,"learner@example.test"]);
   expect(JSON.parse(await readFile(file,"utf8"))).toEqual([]);
  }finally{
   stdout.mockRestore();stderr.mockRestore();await rm(folder,{recursive:true,force:true});
  }
 });
 it("serializes concurrent invitation issuance and does not allow accidental lost updates",async()=>{
  const folder=await mkdtemp(join(tmpdir(),"lingua-beta-lock-test-"));
  const file=join(folder,"invites.json");
  const stdout=vi.spyOn(process.stdout,"write").mockImplementation(()=>true);
  const stderr=vi.spyOn(process.stderr,"write").mockImplementation(()=>true);
  try{
   const results=await Promise.allSettled([
    main(["issue",file,"first@example.test","3"]),
    main(["issue",file,"second@example.test","3"]),
   ]);
   expect(results.filter(x=>x.status==="fulfilled")).toHaveLength(1);
   expect(results.filter(x=>x.status==="rejected")).toHaveLength(1);
   expect(String((results.find(x=>x.status==="rejected") as PromiseRejectedResult).reason)).toContain("locked");
   const rows=JSON.parse(await readFile(file,"utf8"));
   expect(rows).toHaveLength(1);
   const remaining=rows[0].email==="first@example.test"?"second@example.test":"first@example.test";
   await main(["issue",file,remaining,"3"]);
   const two=JSON.parse(await readFile(file,"utf8"));
   expect(two).toHaveLength(2);
   expect(new Set(two.map((row:{email:string})=>row.email)).size).toBe(2);
   await expect(stat(file+".lock")).rejects.toMatchObject({code:"ENOENT"});
  }finally{stdout.mockRestore();stderr.mockRestore();await rm(folder,{recursive:true,force:true});}
 });
 it("fails closed with an existing lock or a readable parent directory",async()=>{
  const folder=await mkdtemp(join(tmpdir(),"lingua-beta-private-test-"));
  const file=join(folder,"invites.json");
  const stdout=vi.spyOn(process.stdout,"write").mockImplementation(()=>true);
  const stderr=vi.spyOn(process.stderr,"write").mockImplementation(()=>true);
  try{
   await writeFile(file+".lock","",{mode:0o600,flag:"wx"});
   await expect(main(["issue",file,"first@example.test","3"])).rejects.toThrow("locked");
   await expect(stat(file)).rejects.toMatchObject({code:"ENOENT"});
   await unlink(file+".lock");
   await chmod(folder,0o755);
   await expect(main(["issue",file,"first@example.test","3"])).rejects.toThrow("private (0700)");
   await chmod(folder,0o700);
   await main(["issue",file,"first@example.test","3"]);
   expect(JSON.parse(await readFile(file,"utf8"))).toHaveLength(1);
  }finally{stdout.mockRestore();stderr.mockRestore();await chmod(folder,0o700).catch(()=>{});await rm(folder,{recursive:true,force:true});}
 });
 it("refuses symlinks, broad-permission stores, checkout-local paths and invalid periods",async()=>{
  const folder=await mkdtemp(join(tmpdir(),"lingua-beta-unsafe-"));
  const raw=join(folder,"raw.json"),alias=join(folder,"link.json");
  const stderr=vi.spyOn(process.stderr,"write").mockImplementation(()=>true);
  const stdout=vi.spyOn(process.stdout,"write").mockImplementation(()=>true);
  try{
   await writeFile(raw,"[]",{mode:0o644});
   await symlink(raw,alias);
   await expect(main(["audit",raw])).rejects.toThrow("0600");
   await expect(main(["audit",alias])).rejects.toThrow("symlink");
   await expect(main(["issue",join(folder,"new.json"),"learner@example.test","31"])).rejects.toThrow("lifetime");
   await expect(main(["issue",join(process.cwd(),"pilot-invitations.json"),"learner@example.test","3"])).rejects.toThrow("inside the repository");
  }finally{
   stdout.mockRestore();stderr.mockRestore();await rm(folder,{recursive:true,force:true});
  }
 });
});
