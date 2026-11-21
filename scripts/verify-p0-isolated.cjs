#!/usr/bin/env node
// No dependencies: validates the pure TypeScript queue and SRS modules.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'lingua-p0-'));
const args=['--strict','--target','es2022','--module','commonjs','--outDir',tmp,'--lib','es2022,dom','--skipLibCheck','client/src/lib/offline-learning.ts','shared/learning.ts','server/knowledge-ownership.ts'];
try{
 const build=spawnSync('tsc',args,{cwd:root,encoding:'utf8'});
 if(build.stdout)process.stdout.write(build.stdout);
 if(build.stderr)process.stderr.write(build.stderr);
 if(build.status!==0)process.exitCode=build.status||1;
 else {
  const test=spawnSync(process.execPath,['--test',path.join(root,'scripts/p0-isolated.test.cjs')],{encoding:'utf8',env:{...process.env,LINGUA_P0_COMPILED:tmp}});
  if(test.stdout)process.stdout.write(test.stdout);
  if(test.stderr)process.stderr.write(test.stderr);
  process.exitCode=test.status||0;
 }
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
