import {AppError} from '../errors/AppError.js';
export function publicInstrument(asset){return asset?{...asset,measurement_mode:asset.measurement_mode??'numeric',condition:asset.condition??'unknown'}:asset;}
export function assertNumericEquipment(asset,{requireProfile=true}={}){
  if(!asset||asset.active===false)throw new AppError(422,'INSTRUMENT_UNAVAILABLE','Select enabled registered equipment.');
  if(asset.condition==='not_working')throw new AppError(422,'EQUIPMENT_NOT_WORKING','Equipment is marked not working; choose another tool.');
  if(asset.measurement_mode==='visual'||asset.profile===null||requireProfile&&!asset.profile)throw new AppError(422,'NUMERIC_EQUIPMENT_REQUIRED','Choose equipment with a numeric profile.');
}
