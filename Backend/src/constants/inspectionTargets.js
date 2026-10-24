import {CATALOG} from './maintenanceCatalog.js';
// Object under inspection, independent of whether the result is numeric or OK/NG.
const productChecks=new Set(['ring_housing_position','appearance_talc','gasket_position','hexagon_difference','chart_depth_after_press','chart_sweeping_depth','chart_hexagon_size','chart_caulking_height','chart_gasket_press','chart_ee_length']);
const knownChecks=new Set(CATALOG.map(d=>d.id));
export function inspectionTarget(definition){
  if(['machine','product'].includes(definition.inspection_target))return definition.inspection_target;
  if(!knownChecks.has(definition.id))return null;
  return productChecks.has(definition.id)?'product':'machine';
}
