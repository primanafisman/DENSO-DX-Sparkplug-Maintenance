import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
test('architecture checker reports controller bypasses and missing layers',async()=>{
  const {checkArchitecture}=await import('../scripts/check-architecture.js');
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'spm-architecture-'));
  try{await fs.mkdir(path.join(root,'src','controllers'),{recursive:true});await fs.writeFile(path.join(root,'src','controllers','bad.js'),"import x from '../models/x.js';");const result=await checkArchitecture(root);assert.ok(result.some(s=>s.includes('Controller bypasses service')));assert.ok(result.some(s=>s.includes('Missing layer: services')));}finally{await fs.rm(root,{recursive:true,force:true});}
});
