import {createHash} from 'node:crypto';
import {CATALOG} from '../constants/maintenanceCatalog.js';
import {DEFAULT_MAINTENANCE_SETTINGS} from '../constants/maintenanceSettings.js';
import {inspectionTarget} from '../constants/inspectionTargets.js';
import {scheduleAt,snapshotOccurrence} from './productionContextService.js';
import {XR_IMPORT_KIND,XR_IMPORT_SOURCE,XR_IMPORT_LABEL,XR_IMPORT_DEFINITIONS,xrManifestId,xrRecordChecksum,trustedXrImport} from './illustrativeXrOrigin.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const DAY=86400000;
const actor_id='local-xr-import';

export function createLocalXrImportService({config,repositories,clock=Date.now}){
  if(config.environment!=='development'||config.database?.dialect!=='sqlite')throw new Error('X/R test import requires local development SQLite only.');
  async function build(){
    const settings=(await repositories.settings.get('maintenance-settings'))?.value??structuredClone(DEFAULT_MAINTENANCE_SETTINGS),schedule=scheduleAt(clock(),settings);
    const line=settings.lines.includes('17')?'17':settings.lines[0];if(!line)throw new Error('Configure an active production line before importing X/R test data.');
    const end=Date.parse(schedule.production_date+'T12:00:00Z'),production_date_from=new Date(end-6*DAY).toISOString().slice(0,10),production_date_to=schedule.production_date;
    const batch_id='xr-v1-'+hash({source:XR_IMPORT_SOURCE,line,production_date_from,production_date_to}).slice(0,32),created_at=new Date(clock()).toISOString(),records=[];
    for(let time=end-6*DAY;time<=end;time+=DAY){
      const date=new Date(time).toISOString().slice(0,10),day=Math.floor(time/DAY);
      for(const source of CATALOG.filter(d=>XR_IMPORT_DEFINITIONS.has(d.id)))for(const type of ['U','V']){
        const definition_snapshot={...structuredClone(source),inspection_target:inspectionTarget(source)},product_snapshot={id:'xr-test-'+type.toLowerCase(),code:'XR-TEST-'+type,name:'Type uji '+type,version:1};
        const context={line,production_date:date,shift:'day',sampler:settings.allowed_samplers.includes('Ldr')?'Ldr':settings.allowed_samplers[0]??'Ldr',product_type_id:product_snapshot.id};
        const id='xr-'+hash({source:XR_IMPORT_SOURCE,date,definition:source.id,type,line}).slice(0,60),checked_at=date+'T07:45:00+07:00';
        const instrument_snapshot={id:'xr-test-'+source.id,name:XR_IMPORT_LABEL+' · '+source.name,code:'XR-TEST-'+source.display_order,revision:1,active:false,condition:'unknown',measurement_mode:'numeric',instrument_type:'other',area:line,aliases:[],maintenance_check_ids:[source.id],profile:{kind:'digital',unit:source.unit,minimum:0,maximum:600,decimals:3,tolerance:.02}};
        const width=source.limits.maximum-source.limits.minimum,center=(source.limits.minimum+source.limits.maximum)/2;
        const outcomes=source.samples.map((sample,i)=>{const offset=(type==='U'?-.04:.04)+.025*Math.sin(day*.7)+.018*(i-(source.samples.length-1)/2),value=Number((center+width*offset).toFixed(3));return {sample_id:sample.id,value,status:value>=source.limits.minimum&&value<=source.limits.maximum?'OK':'NG'};});
        const record={id,definition_id:source.id,definition_version:source.definition_version,definition_snapshot,product_snapshot,instrument_snapshot,context,checked_at,created_at,saved_at:created_at,actor_id,interval:source.intervals[0],trigger:'routine',schedule_snapshot:snapshotOccurrence(checked_at,settings),settings_snapshot:structuredClone(settings),observations:outcomes.map(({sample_id,status})=>({sample_id,status})),outcomes,overall_status:outcomes.every(o=>o.status==='OK')?'OK':'NG',origin:{kind:XR_IMPORT_KIND,label:XR_IMPORT_LABEL,batch_id,version:1,source:XR_IMPORT_SOURCE,checksum:''}};
        record.origin.checksum=xrRecordChecksum(record);records.push(record);
      }
    }
    return {batch_id,line,production_date_from,production_date_to,created_at,records};
  }
  const summary=data=>({batch_id:data.batch_id,label:XR_IMPORT_LABEL,line:data.line,production_date_from:data.production_date_from,production_date_to:data.production_date_to,record_count:data.records.length,definitions:[...XR_IMPORT_DEFINITIONS],product_types:['Type uji U','Type uji V'],photo_readings_created:0,operational_masters_changed:0});
  return {
    async plan(){return {mode:'dry-run',...summary(await build())};},
    async apply(){const data=await build();return repositories.transaction(async tx=>{
      const existingManifest=await tx.settings.get(xrManifestId(data.batch_id));
      if(existingManifest){if(existingManifest.kind!=='local_xr_import_manifest'||existingManifest.source!==XR_IMPORT_SOURCE)throw new Error('Import batch ID belongs to another record; no overwrite.');return {...summary(data),created:0,skipped:data.records.length,rolled_back:!!existingManifest.rolled_back_at};}
      const created=[],record_checksums={};let skipped=0;
      for(const record of data.records){const previous=await tx.maintenance.getRecord(record.id);if(previous){if(previous.origin?.kind!==XR_IMPORT_KIND||previous.origin.source!==XR_IMPORT_SOURCE)throw new Error('Test record ID conflict; no existing data was overwritten.');skipped++;continue;}await tx.maintenance.createRecord(record);created.push(record.id);record_checksums[record.id]=record.origin.checksum;}
      await tx.settings.create({id:xrManifestId(data.batch_id),kind:'local_xr_import_manifest',source:XR_IMPORT_SOURCE,version:1,batch_id:data.batch_id,label:XR_IMPORT_LABEL,line:data.line,production_date_from:data.production_date_from,production_date_to:data.production_date_to,created_at:data.created_at,record_checksums,record_ids:created});
      await tx.audit.append({actor_id,action:'local_xr_test_imported',entity_id:data.batch_id,created:created.length,skipped,label:XR_IMPORT_LABEL});
      return {...summary(data),created:created.length,skipped};
    });},
    async rollback(batch_id,{apply=true}={}){
      if(!/^xr-v1-[a-f0-9]{32}$/.test(batch_id??''))throw new Error('Provide the exact X/R import batch ID.');
      return repositories.transaction(async tx=>{
        const manifest=await tx.settings.get(xrManifestId(batch_id));if(!manifest||manifest.kind!=='local_xr_import_manifest'||manifest.source!==XR_IMPORT_SOURCE)throw new Error('X/R import batch not found.');
        if(manifest.rolled_back_at)return {mode:apply?'rollback':'rollback-dry-run',batch_id,label:XR_IMPORT_LABEL,deleted:0,skipped_conflicts:manifest.rollback_skipped_conflicts??0};
        let deleted=0,skipped_conflicts=0;const at=new Date(clock()).toISOString(),manifests=new Map([[batch_id,manifest]]);
        for(const id of manifest.record_ids??[]){const record=await tx.maintenance.getRecord(id);if(!record||record.deleted_at)continue;if(record.origin?.batch_id!==batch_id||!trustedXrImport(record,manifests)){skipped_conflicts++;continue;}if(apply)await tx.maintenance.updateRecord(id,{deleted_at:at,deleted_by:actor_id});deleted++;}
        if(apply){await tx.settings.update(xrManifestId(batch_id),{rolled_back_at:at,rollback_skipped_conflicts:skipped_conflicts});await tx.audit.append({actor_id,action:'local_xr_test_rolled_back',entity_id:batch_id,deleted,skipped_conflicts});}
        return {mode:apply?'rollback':'rollback-dry-run',batch_id,label:XR_IMPORT_LABEL,deleted,skipped_conflicts};
      });
    },
  };
}
