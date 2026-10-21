import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {database} from './support-db.js';
import {profile,item,context,cvDouble} from './support.js';
import {createInstrumentService} from '../src/services/instrumentService.js';
import {createAnalysisService} from '../src/services/analysisService.js';
import {createReadingService} from '../src/services/readingService.js';
import {createMaintenanceService} from '../src/services/maintenanceService.js';
const actor={id:'admin',role:'Admin'},clock=()=>Date.now();

test('visual equipment has no fake profile and numeric equipment must have one',async()=>{
  const {repo,close}=await database(),service=createInstrumentService({repositories:repo,clock});
  try{
    const visual=await service.create({name:'Packing tool',measurement_mode:'visual',condition:'working',profile:null},actor);
    assert.equal(visual.profile,null);assert.equal(visual.measurement_mode,'visual');
    await assert.rejects(service.create({name:'Broken numeric',measurement_mode:'numeric',profile:null},actor),/equipment|profile/i);
    await assert.rejects(service.createCalibration(visual.id,{image_id:'a',roi:item.roi,pivot:{x:.5,y:.5},scale_points:Array.from({length:6},(_,i)=>({x:.2+i*.1,y:.2,value:i/5}))},actor),error=>error.code==='CALIBRATION_UNSUPPORTED');
  }finally{await close();}
});

test('condition reason and actor are audited; legacy unknown and enablement stay independent',async()=>{
  const {repo,close}=await database(),service=createInstrumentService({repositories:repo,clock});
  try{
    await repo.instruments.create({id:'legacy',name:'Original',profile,active:true,revision:1});
    assert.equal((await service.get('legacy')).condition,'unknown');
    await assert.rejects(service.update('legacy',{name:'Original',profile,condition:'not_working',active:true},actor),/reason/i);
    const changed=await service.update('legacy',{name:'Original',profile,condition:'not_working',condition_reason:'Sensor rusak',active:true},actor);
    assert.equal(changed.active,true);assert.equal(changed.condition,'not_working');assert.equal(changed.condition_changed_by,'admin');
    assert.equal((await repo.instruments.get('legacy')).condition_reason,'Sensor rusak');
  }finally{await close();}
});

test('server registry search finds matches after the first 100 and filters conditions',async()=>{
  const {repo,close}=await database(),service=createInstrumentService({repositories:repo,clock});
  try{
    await repo.transaction(async tx=>{for(let i=0;i<151;i++)await tx.instruments.create({id:'g'+i,name:'Gauge '+i,code:'G-'+i,aliases:i===150?['EE-CUT']:[],active:true,profile,condition:i===150?'not_working':'working'});});
    const result=await service.list({q:'EE-CUT',limit:25,condition:'not_working'});
    assert.equal(result.items.length,1);assert.equal(result.items[0].id,'g150');
  }finally{await close();}
});

test('not-working tools cannot start or confirm a numeric measurement',async()=>{
  const {repo,close}=await database(),directory=await fs.mkdtemp(path.join(os.tmpdir(),'spm-condition-'));
  const asset={id:'g',name:'Gauge',active:true,condition:'not_working',profile,maintenance_check_ids:['check1']};
  const photo={private_id:'p',context,bytes:Buffer.from('x')};
  try{
    await repo.instruments.create(asset);
    const deps={repositories:repo,clock,cvClient:cvDouble(),config:{maxJobs:5,ttlSeconds:900,runtimeDir:directory}};
    const analyses=createAnalysisService(deps,{get:()=>photo});
    await assert.rejects(analyses.submit({image_id:'p',items:[{...item,instrument_id:'g'}]},actor),error=>error.code==='EQUIPMENT_NOT_WORKING');
    const readings=createReadingService(deps,{getResult:()=>({submitted:{...item,instrument_id:'g'},instrument_snapshot:asset,context,photo,result:{}})},{});
    await assert.rejects(readings.confirm({analysis_id:'a',instrument_id:'g',final_value:.438,verified:true,identity_verified:true,context,check_id:'check1',sample_key:'n1',reason:'',confirmation_id:'c'},actor),error=>error.code==='EQUIPMENT_NOT_WORKING');
  }finally{await close();await fs.rm(directory,{recursive:true,force:true});}
});

test('not-working equipment cannot satisfy numeric maintenance; disabled visual history stays intact',async()=>{
  const {repo,close}=await database(),maintenance=createMaintenanceService({repositories:repo,clock});
  try{
    await repo.instruments.create({id:'load',name:'Load',active:true,condition:'not_working',profile,maintenance_check_ids:['actual_load_lower_ring']});
    const observations=[];for(let i=1;i<=4;i++){const id='r'+i;await repo.readings.createConfirmed({id,analysis_id:id,evidence_key:id,confirmation_id:id,instrument_id:'load',final_value:'7.5',context,check_id:'actual_load_lower_ring',sample_key:'n'+i,profile_snapshot:{unit:'kN'},confirmed_at:'2026-10-14T01:00:00Z',evidence:{}});observations.push({sample_id:'n'+i,reading_id:id});}
    await assert.rejects(maintenance.createRecord({definition_id:'actual_load_lower_ring',context,interval:'per_shift',trigger:'routine',checked_at:'2026-10-14T01:00:00Z',observations},actor),error=>error.code==='EQUIPMENT_NOT_WORKING');
    await repo.instruments.create({id:'visual',name:'Original tool',active:true,measurement_mode:'visual',maintenance_check_ids:['packing_depth_tool']});
    const record=await maintenance.createRecord({definition_id:'packing_depth_tool',instrument_id:'visual',context,interval:'per_shift',trigger:'start_process',checked_at:'2026-10-14T01:00:00Z',observations:[{sample_id:'check',status:'OK'}]},actor);
    await repo.instruments.update('visual',{name:'New name',active:false});
    assert.equal((await repo.maintenance.getRecord(record.id)).instrument_snapshot.name,'Original tool');
  }finally{await close();}
});
