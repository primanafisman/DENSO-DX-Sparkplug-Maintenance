import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
export async function database(){const {createRepositories}=await import('../src/repositories/index.js');const {initializeDatabase}=await import('../scripts/initialize-database.js');const directory=await fs.mkdtemp(path.join(os.tmpdir(),'spm-db-'));const config={database:{dialect:'sqlite',storage:path.join(directory,'test.sqlite')}};await initializeDatabase(config);const repo=await createRepositories(config);return {repo,config,close:async()=>{await repo.close();await fs.rm(directory,{recursive:true,force:true});}};}
