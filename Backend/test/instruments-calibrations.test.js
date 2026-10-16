import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './support-db.js';
import {profile} from './support.js';
test('equipment validates profiles and immutable calibrations belong to one equipment identity',async()=>{
  const {createInstrumentService}=await import('../src/services/instrumentService.js');const {repo,close}=await database();const service=createInstrumentService({repositories:repo,clock:()=>Date.now()});const actor={id:'admin',role:'Admin'};
  try{const gauge=await service.create({name:'Test Pressure',code:'G-1',aliases:['Pressure'],area:'17',instrument_type:'pressure_gauge',active:true,profile,maintenance_check_ids:['check1']},actor);assert.equal(gauge.name,'Test Pressure');const updated=await service.update(gauge.id,{name:'Test 2',code:'G-1',aliases:['Pressure'],area:'17',instrument_type:'pressure_gauge',active:true,profile,maintenance_check_ids:['check1']},actor);assert.equal(updated.revision,2);assert.equal(await repo.calibrations.get('missing'),null);}finally{await close();}
});
