import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertNodeVersion,loadConfig} from '../src/config/runtime.js';
import {createRepositories} from '../src/repositories/index.js';
import {createLocalXrImportService} from '../src/services/localXrImportService.js';

export function importOptions(args){
  let apply=false,rollback;
  for(let i=0;i<args.length;i++){
    if(args[i]==='--apply')apply=true;
    else if(args[i]==='--rollback'&&!rollback&&args[i+1]&&!args[i+1].startsWith('--'))rollback=args[++i];
    else throw new Error('Usage: node scripts/import-local-xr-test-data.js [--apply] [--rollback <batch_id>]. Dry-run is default.');
  }
  return {apply,rollback};
}
export async function runLocalXrImport(config,options){
  const repositories=await createRepositories(config);
  try{
    const service=createLocalXrImportService({config,repositories});
    return options.rollback?await service.rollback(options.rollback,{apply:options.apply}):options.apply?await service.apply():await service.plan();
  }finally{await repositories.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    assertNodeVersion();const options=importOptions(process.argv.slice(2));
    process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
    try{process.loadEnvFile('.env');}catch(error){if(error.code!=='ENOENT')throw error;}
    console.log(JSON.stringify(await runLocalXrImport(loadConfig(),options),null,2));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
