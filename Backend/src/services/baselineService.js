import {AppError} from '../errors/AppError.js';
import {baselineInput} from '../validations/reportValidation.js';
export function createBaselineService({repositories,clock},reports){
  async function get(id){const row=await repositories.revisions.get(id);if(row?.entity_id!=='spc-baselines')throw new AppError(404,'BASELINE_NOT_FOUND','Saved baseline not found.');return row;}
  return {get,
    list:input=>repositories.revisions.list({entity_id:'spc-baselines',...input}),
    async create(raw,actor){
      const parsed=baselineInput.safeParse(raw);if(!parsed.success)throw new AppError(422,'BASELINE_FIELDS','Check baseline scope and review reason.');const input=parsed.data;
      const report=await reports.spc(input.scope,{method:input.method}),cohort=report.cohorts.find(c=>c.cohort_id===input.cohort_id);
      if(!cohort?.counts.complete||cohort.control_limits.ucl_x===null)throw new AppError(422,'BASELINE_DATA','Choose a complete supported SPC cohort.');
      return repositories.transaction(async tx=>{
        const saved=await tx.revisions.create({entity_id:'spc-baselines',version:1,scope:report.meta.scope,as_of:report.meta.as_of,cohort_key:cohort.cohort_key,cohort_id:cohort.cohort_id,method:input.method,constants_version:cohort.statistics.constants_version,control_limits:cohort.control_limits,center:{xbar:cohort.control_limits.center_x,rbar:cohort.control_limits.center_r},created_by:actor.id,created_at:new Date(clock()).toISOString(),review_reason:input.review_reason});
        await tx.audit.append({actor_id:actor.id,action:'spc_baseline_saved',entity_id:saved.id,reason:input.review_reason});return saved;
      });
    },
    async apply(report,id){
      const baseline=await get(id);
      if(report.cohorts.some(c=>c.cohort_key!==baseline.cohort_key))throw new AppError(422,'BASELINE_COHORT_CONFLICT','Choose a baseline for this exact product/standard/equipment cohort.');
      return {...report,cohorts:report.cohorts.map(c=>({...c,control_limits:baseline.control_limits,baseline:{id:baseline.id,source:'frozen',as_of:baseline.as_of,scope:baseline.scope,method:baseline.method},warnings:[...c.warnings,'PERIOD_CAPABILITY_WITH_FROZEN_CONTROL_LIMITS']}))};
    },
  };
}
