import {AppError} from '../errors/AppError.js';
import {CATALOG} from '../constants/maintenanceCatalog.js';
import {definitionUpdate} from '../validations/maintenanceValidation.js';
import {archiveRevision} from '../utils/revision.js';

export function createDefinitionService({repositories,clock}){
  async function get(id,repo=repositories){const source=CATALOG.find(d=>d.id===id);if(!source)throw new AppError(404,'MAINTENANCE_NOT_FOUND','Maintenance check not found.');return await repo.maintenance.getDefinition(id)||structuredClone(source);}
  return {get,
    async update(id,input,actor){
      const parsed=definitionUpdate.safeParse(input);if(!parsed.success)throw new AppError(422,'MAINTENANCE_FIELDS','Check standard, samples and frequency fields.');
      const {review_reason,...data}=parsed.data;
      return repositories.transaction(async tx=>{
        const previous=await get(id,tx),updated={...previous,...data,definition_version:previous.definition_version+1,effective_at:new Date(clock()).toISOString()};
        const expected={visual:'ok_ng',functional:'ok_ng',numeric:'photo',difference:'photo_difference'}[updated.kind];
        if(updated.input_method!==expected)throw new AppError(422,'METHOD_CONFLICT','Input method does not match inspection kind.');
        if(['numeric','difference'].includes(updated.kind)&&(!updated.unit||!updated.limits))throw new AppError(422,'STANDARD_REQUIRED','Numeric checks require unit and specification limits.');
        if(['visual','functional'].includes(updated.kind)&&(updated.unit||updated.limits))throw new AppError(422,'VISUAL_STANDARD','Visual checks do not have numeric limits.');
        if(data.occurrence_rule&&updated.intervals.includes('weekly')&&!data.occurrence_rule.weekdays?.length)throw new AppError(422,'WEEKDAYS_REQUIRED','Select weekly inspection weekdays.');
        updated.sample_count=updated.samples.length;
        await archiveRevision(tx,{entity_id:'definition:'+id,version:previous.definition_version,value:previous,actor_id:actor.id,reason:'Preserved before revision',effective_at:previous.effective_at??null,archived_at:updated.effective_at});
        const saved=await tx.maintenance.getDefinition(id)?await tx.maintenance.updateDefinition(id,updated):await tx.maintenance.createDefinition(updated);
        await archiveRevision(tx,{entity_id:'definition:'+id,version:updated.definition_version,value:saved,actor_id:actor.id,reason:review_reason,effective_at:updated.effective_at,archived_at:updated.effective_at});
        await tx.audit.append({actor_id:actor.id,action:'maintenance_definition_updated',entity_id:id,reason:review_reason,version:updated.definition_version,effective_at:updated.effective_at});
        return saved;
      });
    },
    async revisions(id,input){await get(id);return repositories.revisions.list({entity_id:'definition:'+id,...input});},
  };
}
