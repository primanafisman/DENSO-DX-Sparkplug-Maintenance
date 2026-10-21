import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {database} from './support-db.js';
import {context,profile,item,cvDouble} from './support.js';
import {context as contextSchema} from '../src/validations/sharedValidation.js';
import {createPhotoService} from '../src/services/photoService.js';
import {createMaintenanceService} from '../src/services/maintenanceService.js';
import {createReadingService} from '../src/services/readingService.js';
const actor={id:'operator',role:'Operator'};
const settings={lines:['17'],allowed_samplers:['Ldr'],night_rollover_hour:12,product_types:[{id:'u',code:'U',name:'U-Type',active:true,version:1}]};

test('legacy context stays exact and optional product identity is validated',async()=>{
  const {resolveProduct}=await import('../src/services/productionContextService.js');
  assert.deepEqual(contextSchema.parse(context),context);
  assert.equal(contextSchema.parse({...context,product_type_id:'u'}).product_type_id,'u');
  assert.equal(resolveProduct(undefined,settings),null);
  assert.throws(()=>resolveProduct('missing',settings),/product/i);
  assert.throws(()=>resolveProduct('u',{...settings,product_types:[{...settings.product_types[0],active:false}]}),/product/i);
});

test('occurrence snapshots use inclusive server boundaries through midnight',async()=>{
  const {snapshotOccurrence}=await import('../src/services/productionContextService.js');
  for(const [stamp,slot] of [['2026-10-15T01:14:59+07:00','night-2115'],['2026-10-15T01:15:00+07:00','night-0115'],['2026-10-15T07:44:59+07:00','night-0115'],['2026-10-15T07:45:00+07:00','day-0745'],['2026-10-15T12:45:00+07:00','day-1245'],['2026-10-15T21:15:00+07:00','night-2115']]){
    const result=snapshotOccurrence(stamp,settings);assert.equal(result.slot_id,slot);assert.equal(result.timezone,'Asia/Jakarta');
  }
});

test('captured product snapshot and context survive master rename and later confirmation',async()=>{
  const {repo,close}=await database();const directory=await fs.mkdtemp(path.join(os.tmpdir(),'spm-product-'));
  let now=Date.parse('2026-10-14T12:44:59+07:00');const production={...context,product_type_id:'u'};
  const dependencies={repositories:repo,config:{runtimeDir:directory,ttlSeconds:900},clock:()=>now,cvClient:cvDouble()};
  const photos=createPhotoService(dependencies);const maintenance=createMaintenanceService(dependencies);
  try{
    await repo.settings.update('maintenance-settings',{value:settings});
    const photo=await photos.upload({bytes:Buffer.from('camera'),mimeType:'image/jpeg',context:production,actor});
    const asset={id:'g1',name:'Gauge',active:true,profile,maintenance_check_ids:['check1']};await repo.instruments.create(asset);
    await maintenance.updateSettings({...settings,product_types:[{...settings.product_types[0],name:'Renamed'}]},actor);
    assert.equal((await maintenance.getSettings()).product_types[0].version,2);
    now=Date.parse('2026-10-14T12:45:10+07:00');
    const source=photos.get(photo.image_id,actor),snapshot={submitted:{...item,instrument_id:'g1'},instrument_snapshot:asset,context:production,photo:source,result:{candidate:{value:.438},confidence:{valid:true},validated_prediction:.438}};
    const readings=createReadingService(dependencies,{getResult:()=>snapshot},photos);
    const saved=await readings.confirm({analysis_id:'a',instrument_id:'g1',final_value:.438,verified:true,identity_verified:true,context:production,check_id:'check1',sample_key:'n1',reason:'',confirmation_id:'c'},actor);
    assert.equal(saved.product_snapshot.name,'U-Type');assert.equal(saved.product_snapshot.version,1);assert.deepEqual(saved.context,production);
    await maintenance.updateSettings({lines:['17'],allowed_samplers:['Ldr'],night_rollover_hour:12},actor);
    assert.equal((await maintenance.getSettings()).product_types[0].name,'Renamed');
    assert.equal(photos.get(photo.image_id,actor).product_snapshot.name,'U-Type');
  }finally{photos.close();await close();await fs.rm(directory,{recursive:true,force:true});}
});

test('new visual records preserve equipment identity and distinguish occurrences in one slot',async()=>{
  const {repo,close}=await database(),service=createMaintenanceService({repositories:repo,clock:()=>Date.parse('2026-10-14T01:00:00Z')});
  try{
    await repo.settings.update('maintenance-settings',{value:settings});
    await repo.instruments.create({id:'tool',name:'Packing tool',active:true,maintenance_check_ids:['packing_depth_tool']});
    const input={definition_id:'packing_depth_tool',context:{...context,product_type_id:'u'},instrument_id:'tool',interval:'per_shift',trigger:'start_process',checked_at:'2026-10-14T01:00:00Z',observations:[{sample_id:'check',status:'OK'}]};
    const a=await service.createRecord(input,actor),b=await service.createRecord(input,actor);
    assert.notEqual(a.id,b.id);assert.equal(a.schedule_snapshot.slot_id,'day-0745');assert.equal(a.instrument_snapshot.name,'Packing tool');assert.equal(a.product_snapshot.name,'U-Type');
  }finally{await close();}
});
