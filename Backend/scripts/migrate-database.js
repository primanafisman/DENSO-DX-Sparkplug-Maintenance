import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
import {connectDatabase} from '../src/config/db.js';
import {defineModels} from '../src/models/index.js';
import {SCHEMA_VERSION} from '../src/constants/schemaVersion.js';
import {loadConfig,assertNodeVersion} from '../src/config/runtime.js';
import {up} from './migrations/002-report-indexes.js';

export async function migrateDatabase(config){
  let db=connectDatabase(config),models=defineModels(db),version;
  try{version=JSON.parse((await models.schema.findByPk('schema-version'))?.payload||'null')?.version;}
  finally{await db.close();}
  if(version===SCHEMA_VERSION)return {from:version,to:version};
  if(version!==1)throw new Error('Incompatible schema version; migration requires version 1.');
  if(config.database.dialect==='sqlite'){
    const backup=config.database.storage+'.backup-'+new Date().toISOString().replace(/[:.]/g,'-');
    await fs.copyFile(config.database.storage,backup,1);
  }else if(!config.database.backupConfirmed)throw new Error('Confirm an administrator database backup before migration.');
  db=connectDatabase(config);models=defineModels(db);
  try{
    await db.transaction(async transaction=>{
      await up(db,transaction);
      await models.schema.update({payload:JSON.stringify({version:SCHEMA_VERSION})},{where:{id:'schema-version'},transaction});
    });
    return {from:version,to:SCHEMA_VERSION};
  }finally{await db.close();}
}

async function portOpen(port){return new Promise(resolve=>{const socket=net.connect({host:'127.0.0.1',port});const done=result=>{socket.destroy();resolve(result);};socket.once('connect',()=>done(true));socket.once('error',()=>done(false));socket.setTimeout(500,()=>done(false));});}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    assertNodeVersion();process.loadEnvFile();const config=loadConfig();
    if(await portOpen(config.port))throw new Error('Stop the local API before database migration.');
    config.database.backupConfirmed=process.env.SPM_DB_BACKUP_CONFIRMED==='1';
    const result=await migrateDatabase(config);console.log(`Schema verified: ${result.from} -> ${result.to}.`);
  }catch(error){console.error(error.message);process.exitCode=1;}
}
