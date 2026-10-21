import {randomUUID} from 'node:crypto';
import {AppError} from '../errors/AppError.js';
import {isDeepStrictEqual} from 'node:util';
import {suggestDiscoveryProfile} from './discoveryProfile.js';
import {assertNumericEquipment} from './equipmentPolicy.js';
export function createAnalysisService({config,repositories,cvClient,clock},photos){
  const jobs=new Map(),results=new Map();
  function sweep(){for(const [id,j] of jobs)if(j.expires_at*1000<clock()){jobs.delete(id);for(const result of j.results)results.delete(result.analysis_id);}for(const [id,result] of results)if(result.expires_at*1000<clock())results.delete(id);}
  async function assets(){let cursor,items=[];do{const page=await repositories.instruments.list({limit:100,cursor});items.push(...page.items.filter(a=>a.active!==false));cursor=page.next_cursor;}while(cursor&&items.length<500);return items;}
  const forArea=(instruments,area)=>instruments.map(a=>area&&!a.area?{...a,area}:a);
  function publicJob(job){return {job_id:job.job_id,status:job.status,processed:job.processed,total:job.total,results:job.results,expires_at:job.expires_at};}
  async function refresh(job){
    if(!job.private_id||['completed','failed','expired'].includes(job.status))return;
    if(job.refresh)return job.refresh;
    job.refresh=(async()=>{
        try{const state=await cvClient.getJob(job.private_id);job.status=state.status;job.processed=state.processed;
          for(const result of state.results){if(job.results.some(r=>r.client_id===result.client_id))continue;const submitted=job.items.find(i=>i.client_id===result.client_id);if(!submitted)throw new AppError(503,'ENGINE_CONTRACT','Reader returned an unknown ROI.');const analysisId=randomUUID();const mapped={...result,analysis_id:analysisId};delete mapped.model;delete mapped.calibration_profile;job.results.push(mapped);results.set(analysisId,{result:mapped,submitted,photo:job.photo,owner_id:job.owner_id,context:job.photo.context,instrument_snapshot:job.instruments.find(a=>a.id===submitted.instrument_id),expires_at:job.expires_at});}
        }catch(err){job.status=err.status===410?'expired':'failed';job.error={code:job.status==='expired'?'ENGINE_EXPIRED':'ENGINE_UNAVAILABLE',message:'Upload again after checking the local reader.'};}

    })();
    try{await job.refresh;}finally{delete job.refresh;}
  }
  return {
    async manual(input,actor){
      sweep();const photo=photos.get(input.image_id,actor),asset=await repositories.instruments.get(input.instrument_id);
      assertNumericEquipment(asset);
      if(!asset?.active)throw new AppError(422,'INSTRUMENT_UNAVAILABLE','Select active registered equipment.');
      if(results.size>=500)throw new AppError(429,'ANALYSIS_CAPACITY','Temporary review capacity reached.');
      const analysis_id=randomUUID(),result={analysis_id,client_id:'manual',candidate:{readable:false,kind:'unknown',value:null,unit:asset.profile.unit,reason:'Pembacaan manual operator berdasarkan foto.'},validated_prediction:null,confidence:{valid:false,level:'low',probability_correct:null,reasons:['Angka harus diisi dan diverifikasi operator; ini bukan hasil CV.']},roi:input.roi,...(input.label_roi?{label_roi:input.label_roi}:{}),method:'operator-photo-review'};
      results.set(analysis_id,{result,submitted:{client_id:'manual',roi:input.roi,...(input.label_roi?{label_roi:input.label_roi}:{}),instrument_id:asset.id,profile:structuredClone(asset.profile)},photo,owner_id:actor.id,context:photo.context,instrument_snapshot:asset,expires_at:photo.expires_at});
      return result;
    },
    async discover(id,input,actor){const photo=photos.get(id,actor),instruments=await assets();const discovered=await cvClient.discover({imageId:photo.private_id,instruments:forArea(instruments.filter(a=>a.measurement_mode!=='visual'&&a.condition!=='not_working'&&a.profile),input.area),area:input.area});return {...discovered,instruments:discovered.instruments.map(proposal=>suggestDiscoveryProfile(proposal,instruments))};},
    async submit(input,actor){sweep();const photo=photos.get(input.image_id,actor);await Promise.all([...jobs.values()].filter(job=>['queued','running'].includes(job.status)).map(refresh));if([...jobs.values()].filter(j=>['queued','running'].includes(j.status)).length>=config.maxJobs)throw new AppError(429,'QUEUE_FULL','Reader queue full; retry later.');const instruments=await assets();const items=[];
      for(const original of input.items){const item=structuredClone(original);const asset=instruments.find(a=>a.id===item.instrument_id);if(item.instrument_id&&!asset)throw new AppError(422,'INSTRUMENT_UNAVAILABLE','Select active registered equipment.');if(asset)assertNumericEquipment(asset);if(asset&&!isDeepStrictEqual(asset.profile,item.profile))throw new AppError(409,'PROFILE_CHANGED','Use the current equipment profile.');if(item.calibration_id){const calibration=await repositories.calibrations.get(item.calibration_id);if(!calibration||calibration.instrument_id!==item.instrument_id)throw new AppError(422,'CALIBRATION_OWNER','Calibration must belong to selected equipment.');if(!isDeepStrictEqual(calibration.profile_snapshot,item.profile))throw new AppError(409,'CALIBRATION_PROFILE_CHANGED','Calibration belongs to a different profile version.');item.calibration=calibration.engine_snapshot;}items.push(item);}
      if([...jobs.values()].filter(j=>['queued','running'].includes(j.status)).length>=config.maxJobs)throw new AppError(429,'QUEUE_FULL','Reader queue full; retry later.');
      const id=randomUUID(),job={job_id:id,owner_id:actor.id,photo,items,instruments,status:'queued',processed:0,total:items.length,results:[],expires_at:clock()/1000+config.ttlSeconds};jobs.set(id,job);
      try{const submitted=await cvClient.submit({imageId:photo.private_id,items,instruments:forArea(instruments,input.area),area:input.area});job.private_id=submitted.job_id;job.status=submitted.status;return publicJob(job);}catch(err){job.status='failed';jobs.delete(id);throw err;}
    },
    async getJob(id,actor){sweep();const job=jobs.get(id);if(!job)throw new AppError(410,'JOB_EXPIRED','Job expired or API restarted; upload again.');if(job.owner_id!==actor.id)throw new AppError(403,'JOB_FORBIDDEN','Job belongs to another user.');await refresh(job);return publicJob(job);},
    getResult(id,actor){sweep();const result=results.get(id);if(!result||result.expires_at*1000<clock())throw new AppError(410,'ANALYSIS_EXPIRED','Analysis expired; upload again.');if(result.owner_id!==actor.id)throw new AppError(403,'ANALYSIS_FORBIDDEN','Analysis belongs to another user.');return result;},
    close(){jobs.clear();results.clear();},
  };
}
