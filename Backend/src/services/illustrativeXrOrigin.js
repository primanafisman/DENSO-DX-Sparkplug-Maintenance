import {createHash} from 'node:crypto';
import {stable} from './reporting/reportScope.js';

export const XR_IMPORT_KIND='illustrative_local_import';
export const XR_IMPORT_SOURCE='local-xr-formula-v1';
export const XR_IMPORT_LABEL='Data uji X/R';
export const XR_IMPORT_DEFINITIONS=new Set(['chart_ee_length','chart_gasket_press','chart_caulking_height','chart_hexagon_size']);
export const xrManifestId=batch_id=>'xr-import:'+batch_id;
export function publicXrOrigin(origin){
  return {kind:origin.kind,label:origin.label,batch_id:origin.batch_id,version:origin.version,source:origin.source};
}
export function isPrivateXrOrigin(origin){
  return !!origin&&Object.keys(origin).sort().join(',')==='batch_id,checksum,kind,label,source,version'&&origin.kind===XR_IMPORT_KIND&&origin.label===XR_IMPORT_LABEL&&origin.version===1&&origin.source===XR_IMPORT_SOURCE&&/^xr-v1-[a-f0-9]{32}$/.test(origin.batch_id)&&/^[a-f0-9]{64}$/.test(origin.checksum);
}
export function xrRecordChecksum(record){
  const value={id:record.id,definition_id:record.definition_id,definition_version:record.definition_version,definition_snapshot:record.definition_snapshot,context:record.context,product_snapshot:record.product_snapshot,instrument_snapshot:record.instrument_snapshot,observations:record.observations,outcomes:record.outcomes,overall_status:record.overall_status,interval:record.interval,trigger:record.trigger,schedule_snapshot:record.schedule_snapshot,settings_snapshot:record.settings_snapshot,actor_id:record.actor_id,checked_at:record.checked_at,origin:publicXrOrigin(record.origin)};
  return createHash('sha256').update(stable(value)).digest('hex');
}
export function trustedXrImport(record,manifests=new Map()){
  const origin=record.origin,manifest=isPrivateXrOrigin(origin)?manifests.get(origin.batch_id):null,def=record.definition_snapshot;
  if(!manifest||manifest.kind!=='local_xr_import_manifest'||manifest.source!==XR_IMPORT_SOURCE||manifest.version!==1||manifest.batch_id!==origin.batch_id||manifest.record_checksums?.[record.id]!==origin.checksum||!XR_IMPORT_DEFINITIONS.has(record.definition_id)||def?.id!==record.definition_id||def.kind!=='numeric'||def.input_method!=='photo'||def.sample_count!==4||def.samples?.length!==4||def.unit!=='mm'||!def.limits||!Number.isFinite(def.limits.minimum)||!Number.isFinite(def.limits.maximum)||def.limits.maximum<=def.limits.minimum||!['xr-test-u','xr-test-v'].includes(record.product_snapshot?.id)||record.context?.product_type_id!==record.product_snapshot.id||record.outcomes?.some(o=>o.reading_id||o.before_reading_id||o.after_reading_id))return false;
  return xrRecordChecksum(record)===origin.checksum;
}
