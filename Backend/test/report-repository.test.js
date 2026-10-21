import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {database} from './support-db.js';
import {connectDatabase} from '../src/config/db.js';
import {defineModels} from '../src/models/index.js';

test('report schema upgrades v1 without rewriting records and is idempotent',async()=>{
  const {migrateDatabase}=await import('../scripts/migrate-database.js');
  const {repo,config,close}=await database();
  try{
    await repo.maintenance.createRecord({id:'legacy',definition_id:'packing_depth_tool',context:{line:'17',production_date:'2026-10-01',shift:'day',sampler:'Ldr'},outcomes:[{sample_id:'check',status:'OK'}]});
    await repo.close();
    const db=connectDatabase(config),models=defineModels(db);
    const before=(await models.maintenanceRecords.findByPk('legacy')).payload;
    await models.schema.update({payload:JSON.stringify({version:1})},{where:{id:'schema-version'}});
    await db.close();
    assert.deepEqual(await migrateDatabase(config),{from:1,to:2});
    assert.deepEqual(await migrateDatabase(config),{from:2,to:2});
    const reopened=connectDatabase(config),after=defineModels(reopened);
    assert.equal((await after.maintenanceRecords.findByPk('legacy')).payload,before);
    assert.equal(JSON.parse((await after.schema.findByPk('schema-version')).payload).version,2);
    await reopened.close();
    const backups=(await fs.readdir(config.database.storage.replace(/[^\\/]+$/,''))).filter(n=>n.includes('.backup-'));
    assert.equal(backups.length,1);
    const {initializeDatabase}=await import('../scripts/initialize-database.js');
    await assert.rejects(initializeDatabase(config),/empty database/);
  }finally{await close();}
});

test('report range and batched readings cross 500 items without dropping data',async()=>{
  const {repo,close}=await database();
  const scope={production_date_from:'2026-10-01',production_date_to:'2026-10-31',line:'17'};
  const as_of='2026-11-01T00:00:00.000Z';
  try{
    await repo.transaction(async tx=>{for(let i=0;i<501;i++){
      const id=`r${String(i).padStart(4,'0')}`;
      await tx.maintenance.createRecord({id,definition_id:'chart_ee_length',created_at:'2026-10-20T00:00:00.000Z',context:{line:'17',production_date:'2026-10-01',shift:'day'}});
      await tx.readings.createConfirmed({id,analysis_id:id,evidence_key:id,confirmation_id:id,instrument_id:'g1',context:{line:'17',production_date:'2026-10-01',shift:'day'},final_value:'4.500'});
    }});
    const first=await repo.maintenance.listRecordsRange({scope,limit:500,as_of});
    const second=await repo.maintenance.listRecordsRange({scope,limit:500,as_of,cursor:first.next_cursor});
    assert.equal(first.items.length,500);assert.equal(second.items.length,1);
    assert.equal(new Set([...first.items,...second.items].map(r=>r.id)).size,501);
    assert.equal((await repo.readings.getMany([...first.items,...second.items].map(r=>r.id))).length,501);
    await assert.rejects(repo.maintenance.listRecordsRange({scope:{...scope,line:"17' OR 1=1--"},limit:500,as_of,cursor:first.next_cursor}),/cursor/i);
    const hostile=await repo.maintenance.listRecordsRange({scope:{...scope,line:"17' OR 1=1--"},limit:500,as_of});
    assert.equal(hostile.items.length,0);
    await assert.rejects(repo.maintenance.listRecordsRange({scope:{...scope,payload:'secret'},limit:500,as_of}),/filter|scope/i);
  }finally{await close();}
});

test('revisions are immutable and scoped by entity',async()=>{
  const {repo,close}=await database();
  try{
    const a=await repo.revisions.create({entity_id:'definition:ee',version:1,value:{maximum:4.6}});
    await repo.revisions.create({entity_id:'definition:other',version:1,value:{maximum:10}});
    assert.deepEqual((await repo.revisions.get(a.id)).value,{maximum:4.6});
    assert.equal((await repo.revisions.list({entity_id:'definition:ee'})).items.length,1);
    assert.equal(repo.revisions.update,undefined);
    await assert.rejects(repo.revisions.create({...a,value:{maximum:9}}));
  }finally{await close();}
});

test('report transaction sees one SQLite snapshot across a concurrent writer',async()=>{
  const {repo,config,close}=await database();
  const {createRepositories}=await import('../src/repositories/index.js');
  const db=connectDatabase(config);await db.query('PRAGMA journal_mode=WAL');await db.close();
  const second=await createRepositories(config);
  const scope={production_date_from:'2026-10-01',production_date_to:'2026-10-31'};
  const as_of='2026-11-01T00:00:00.000Z';
  try{
    await repo.transaction(async tx=>{
      assert.equal((await tx.maintenance.listRecordsRange({scope,limit:500,as_of})).items.length,0);
      await second.maintenance.createRecord({id:'concurrent',definition_id:'x',context:{production_date:'2026-10-01'},created_at:'2026-10-20T00:00:00.000Z'});
      assert.equal((await tx.maintenance.listRecordsRange({scope,limit:500,as_of})).items.length,0);
    });
    assert.equal((await repo.maintenance.listRecordsRange({scope,limit:500,as_of})).items.length,1);
  }finally{await second.close();await close();}
});

test('unknown schema version is rejected by migration and runtime',async()=>{
  const {migrateDatabase}=await import('../scripts/migrate-database.js');
  const {createRepositories}=await import('../src/repositories/index.js');
  const {repo,config,close}=await database();
  try{
    await repo.close();const db=connectDatabase(config),models=defineModels(db);
    await models.schema.update({payload:'{"version":99}'},{where:{id:'schema-version'}});await db.close();
    await assert.rejects(migrateDatabase(config),/version|incompatible/i);
    await assert.rejects(createRepositories(config),/schema|incompatible/i);
  }finally{await close();}
});
