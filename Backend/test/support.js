import request from 'supertest';
import {createHash} from 'node:crypto';
import {config,password,userRepo} from './helpers.js';
export const context={line:'17',production_date:'2026-10-14',shift:'day',sampler:'Ldr'};
export const profile={kind:'digital',unit:'MPa',minimum:0,maximum:1,decimals:3,tolerance:.01};
export const item={client_id:'a',roi:{x:0,y:0,width:1,height:1},profile};
export function cvDouble(){const photos=new Map();return {
  health:async()=>({status:'up',ocr:{weights_present:true,initialized:true}}),
  upload:async({bytes})=>{const result={image_id:'internal',source_hash:createHash('sha256').update(bytes).digest('hex'),source_width:300,source_height:200,preview_width:300,preview_height:200,expires_at:Date.now()/1000+900};photos.set('internal',bytes);return result;},
  discover:async()=>({instruments:[{roi:item.roi,kind_hint:'digital',observed_unit:'MPa',observed_decimals:3}]}),
  submit:async({items})=>({job_id:'private-job',status:'queued',processed:0,total:items.length,results:[],expires_at:Date.now()/1000+900}),
  getJob:async()=>({job_id:'private-job',status:'completed',processed:1,total:1,results:[{client_id:'a',analysis_id:'private-result',candidate:{readable:true,value:.438,unit:'MPa',kind:'digital'},validated_prediction:.438,confidence:{valid:true,level:'medium'},method:'hybrid-cv-v0.2.3'}],expires_at:Date.now()/1000+900}),
  getCrop:async()=>({bytes:photos.get('internal'),mimeType:'image/jpeg'}),
};}
export async function session(extra={}){const {createApp}=await import('../src/app.js');const repositories=await userRepo();repositories.instruments={list:async()=>({items:[],next_cursor:null}),get:async()=>null};const app=createApp({config,repositories,cvClient:cvDouble(),...extra});const token=(await request(app).post('/api/v1/auth/token').send({username:'001',password})).body.data.access_token;return {app,token};}
