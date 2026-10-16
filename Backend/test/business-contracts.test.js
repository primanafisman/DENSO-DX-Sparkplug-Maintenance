import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import {config,password} from './helpers.js';
import {database} from './support-db.js';
import {cvDouble,context,profile,item} from './support.js';
test('business response contracts validate real equipment, catalog, reading and maintenance responses',async()=>{
  const document=JSON.parse(await fs.readFile(new URL('../contracts/openapi.yaml',import.meta.url),'utf8'));
  assert.ok(document.components.schemas.InstrumentResponse?.properties.maintenance_check_ids);
  assert.ok(document.components.schemas.MaintenanceRecord?.properties.outcomes);
  // OpenAPI3 uses draft4 boolean exclusive bounds; AJV8 uses numeric draft7 bounds.
  function draft7(value){if(Array.isArray(value))return value.map(draft7);if(!value||typeof value!=='object')return value;const result=Object.fromEntries(Object.entries(value).map(([key,item])=>[key,draft7(item)]));for(const name of ['Minimum','Maximum']){const key='exclusive'+name,bound=name.toLowerCase();if(typeof result[key]==='boolean'){if(result[key]){result[key]=result[bound];delete result[bound];}else delete result[key];}}return result;}
  const {default:Ajv}=await import('ajv');const {default:formats}=await import('ajv-formats');const ajv=new Ajv({strict:false});formats(ajv);ajv.addSchema(draft7(document),'spm');
  function valid(path,method,status,body){const schema=ajv.compile({$ref:`spm#/paths/${path.replaceAll('~','~0').replaceAll('/','~1')}/${method}/responses/${status}/content/application~1json/schema`});assert.ok(schema(body),JSON.stringify(schema.errors));}
  const {createApp}=await import('../src/app.js');const {repo,close}=await database();const runtime=await fs.mkdtemp(path.join(os.tmpdir(),'spm-contract-'));
  try{const bcrypt=(await import('bcrypt')).default;await repo.users.create({id:'admin',username:'001',password_hash:await bcrypt.hash(password,4),role:'Admin',active:true});const app=createApp({config:{...config,runtimeDir:runtime},repositories:repo,cvClient:cvDouble()});const tokenResponse=await request(app).post('/api/v1/auth/token').send({username:'001',password});valid('/api/v1/auth/token','post',200,tokenResponse.body);const auth={Authorization:`Bearer ${tokenResponse.body.data.access_token}`};
    const equipment=await request(app).post('/api/v1/instruments').set(auth).send({name:'Gauge',profile,maintenance_check_ids:['chart_gasket_press'],instrument_type:'pressure_gauge'}).expect(201);valid('/api/v1/instruments','post',201,equipment.body);
    const list=await request(app).get('/api/v1/instruments').set(auth).expect(200);valid('/api/v1/instruments','get',200,list.body);
    const catalog=await request(app).get('/api/v1/maintenance/catalog').set(auth).expect(200);valid('/api/v1/maintenance/catalog','get',200,catalog.body);
    const maintenance=await request(app).post('/api/v1/maintenance/records').set(auth).send({definition_id:'packing_depth_tool',context,interval:'per_shift',trigger:'start_process',checked_at:'2026-10-14T01:00:00Z',observations:[{sample_id:'check',status:'OK'}]}).expect(201);valid('/api/v1/maintenance/records','post',201,maintenance.body);
    const photo=(await request(app).post('/api/v1/photos').set(auth).field('context',JSON.stringify(context)).attach('image',Buffer.from('photo'),{filename:'photo.jpg',contentType:'image/jpeg'}).expect(201)).body.data;
    const job=(await request(app).post('/api/v1/analysis-jobs').set(auth).send({image_id:photo.image_id,items:[{...item,instrument_id:equipment.body.data.id}]}).expect(202)).body.data;
    const result=(await request(app).get('/api/v1/analysis-jobs/'+job.job_id).set(auth).expect(200)).body.data.results[0];
    const reading=await request(app).post('/api/v1/readings/confirm').set(auth).send({analysis_id:result.analysis_id,instrument_id:equipment.body.data.id,final_value:.438,verified:true,identity_verified:true,context,check_id:'chart_gasket_press',sample_key:'n1',reason:'fixture',confirmation_id:'contract-confirm'}).expect(201);valid('/api/v1/readings/confirm','post',201,reading.body);
    const history=await request(app).get('/api/v1/readings').set(auth).expect(200);valid('/api/v1/readings','get',200,history.body);
  }finally{await close();await fs.rm(runtime,{recursive:true,force:true});}
});
