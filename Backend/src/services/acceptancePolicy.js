import {AppError} from '../errors/AppError.js';

export function snapshotAcceptance(instrument,definition){
  const supplied=instrument?.acceptance_limits;
  const limits=supplied??definition?.limits;
  if(!limits||!['minimum','maximum'].every(key=>limits[key]===null||Number.isFinite(limits[key]))||(limits.minimum===null&&limits.maximum===null)||(limits.minimum!==null&&limits.maximum!==null&&limits.minimum>limits.maximum))
    throw new AppError(422,'STANDARD_REQUIRED','Set valid reviewed acceptance limits before recording.');
  return {acceptance_limits:structuredClone(limits),acceptance_source:supplied?'equipment':'inspection'};
}

export function acceptanceStatus(value,limits){
  return (limits.minimum===null||value+1e-9>=limits.minimum)&&(limits.maximum===null||value-1e-9<=limits.maximum)?'OK':'NG';
}
