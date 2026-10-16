import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
test('database startup fails instead of creating schema implicitly',async()=>{
  const {createRepositories}=await import('../src/repositories/index.js');const directory=await fs.mkdtemp(path.join(os.tmpdir(),'spm-empty-'));
  try{await assert.rejects(createRepositories({database:{dialect:'sqlite',storage:path.join(directory,'empty.sqlite')}}),/schema|initialize/i);}finally{await fs.rm(directory,{recursive:true,force:true});}
});
