import {mkdtemp,readFile,rm,symlink,stat,writeFile} from "node:fs/promises";
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
