import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
test('feature views cannot bypass controllers with HTTP or model API imports',async()=>{
  const {checkArchitecture}=await import('./check-architecture.mjs');const directory=await fs.mkdtemp(path.join(os.tmpdir(),'spm-ui-'));
  try{await fs.mkdir(path.join(directory,'src/features/demo/view'),{recursive:true});await fs.writeFile(path.join(directory,'src/features/demo/view/Bad.tsx'),'import axios from "axios"; fetch("/api");');assert.equal((await checkArchitecture(directory)).length,1);await fs.writeFile(path.join(directory,'src/features/demo/view/Bad.tsx'),'import {useDemo} from "../controller/useDemo";');assert.equal((await checkArchitecture(directory)).length,0);}finally{await fs.rm(directory,{recursive:true,force:true});}
});
