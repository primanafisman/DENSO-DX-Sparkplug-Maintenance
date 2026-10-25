// Only a single machine reading represents one tool's operational check.
// Product groups and before/after measurements retain distinct photo samples.
export function machineEquipmentCheck(definition){
  return definition?.inspection_target!=='product'&&definition?.kind==='numeric'&&definition.input_method==='photo'&&definition.samples?.length===1&&(definition.inspection_target==='machine'||!definition.inspection_target&&definition.unit==='MPa');
}
export function eligibleMachineEquipment(asset,definition){
  return machineEquipmentCheck(definition)&&asset?.active===true&&asset.measurement_mode!=='visual'&&asset.condition!=='not_working'&&asset.profile?.unit===definition.unit&&asset.maintenance_check_ids?.includes(definition.id);
}
export function recordEquipmentId(record){return record.instrument_id??record.instrument_snapshot?.id??null;}
export function operationalRecord(record){return !record.deleted_at&&record.origin?.kind!=='illustrative_local_import';}
