import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import {connectDatabase} from '../src/config/db.js';
import {defineModels,definitions} from '../src/models/index.js';
import {loadConfig,assertNodeVersion} from '../src/config/runtime.js';
import {SCHEMA_VERSION} from '../src/constants/schemaVersion.js';
export async function initializeDatabase(config){
  if(config.database.dialect==='sqlite')await fs.mkdir(path.dirname(config.database.storage),{recursive:true});
  const db=connectDatabase(config),models=defineModels(db),query=db.getQueryInterface();
  try{const existing=await query.showAllTables();if(existing.length)throw new Error('Initialization requires an empty database; no overwrite performed.');for(const [name,def] of Object.entries(definitions)){await query.createTable(def.table,models[name].getAttributes());for(const [i,fields] of def.indexes.entries())await query.addIndex(def.table,fields,{name:`IX_${def.table}_${i}`});}await models.schema.create({id:'schema-version',payload:JSON.stringify({version:SCHEMA_VERSION}),created_at:new Date().toISOString()});}finally{await db.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{assertNodeVersion();process.loadEnvFile();await initializeDatabase(loadConfig());console.log('Schema initialized.');}catch(err){console.error(err.message);process.exitCode=1;}}
