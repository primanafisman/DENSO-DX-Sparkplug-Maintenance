import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import bcrypt from 'bcrypt';
import {createRepositories} from '../src/repositories/index.js';
import {assertNodeVersion,loadConfig} from '../src/config/runtime.js';
export async function seedDemo(config){
  if(config.environment!=='development'||config.database.dialect!=='sqlite')throw new Error('Demo account requires development SQLite only.');
  const repositories=await createRepositories(config);
  try {
    await fs.mkdir(config.runtimeDir,{recursive:true});
    const filename=path.join(config.runtimeDir,'test-access.json');
    let credential;try{credential=JSON.parse(await fs.readFile(filename,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
    const username='SPM-TEST';let user=await repositories.users.findByUsername(username);
    if(user&&!user.local_demo)throw new Error('Demo username belongs to another account; no overwrite.');
    if(!credential){
      credential={username,password:'Spm-'+randomBytes(12).toString('base64url'),role:'Admin',url:'http://127.0.0.1:'+config.port,usage:'Local dummy testing only; generated independently on each installation.'};
      const data={username,role:'Admin',active:true,local_demo:true,password_hash:await bcrypt.hash(credential.password,12)};
      user=user?await repositories.users.update(user.id,data):await repositories.users.create(data);
      await fs.writeFile(filename,JSON.stringify(credential,null,2)+'\n',{flag:'wx',mode:0o600});
    }
    if(credential.username!==username||!user.active||user.role!=='Admin'||!await bcrypt.compare(credential.password,user.password_hash))throw new Error('Dummy credentials do not match; no automatic reset.');
    await fs.writeFile(path.join(config.runtimeDir,'test-access.txt'),['Sparkplug Maintenance - local test account','ID: '+credential.username,'Password: '+credential.password,'Role: '+credential.role,'URL: '+credential.url,'Only for development testing. Never distribute this runtime file.'].join('\r\n')+'\r\n',{mode:0o600});
    return {username,credential_file:'runtime/test-access.txt'};
  }finally{await repositories.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{assertNodeVersion();process.loadEnvFile();const result=await seedDemo(loadConfig());console.log('Dummy account ready: '+result.username+'; credentials in '+result.credential_file+'.');}
  catch(error){console.error(error.message);process.exitCode=1;}
}
