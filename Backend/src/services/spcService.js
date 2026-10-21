import {AppError} from '../errors/AppError.js';
import {SPC_CONSTANTS,SPC_CONSTANTS_VERSION} from '../constants/spcConstants.js';
const finite=value=>Number.isFinite(value)?value:null;
function sum(values){let total=0,correction=0;for(const value of values){const adjusted=value-correction,next=total+adjusted;correction=(next-total)-adjusted;total=next;}return total;}
function variance(values){let n=0,mean=0,m2=0;for(const value of values){const delta=value-mean;mean+=delta/++n;m2+=delta*(value-mean);}return n>1?Math.max(0,m2/(n-1)):null;}

export function calculateSpc({groups,lsl=null,usl=null,method='paper_stdev_s'}){
  if(!['paper_stdev_s','within_rbar_d2'].includes(method)||!Array.isArray(groups)||groups.some(g=>!Array.isArray(g)||!g.length||g.some(x=>typeof x!=='number'||!Number.isFinite(x)))||groups.some(g=>g.length!==groups[0].length))throw new AppError(422,'INVALID_SPC_INPUT','SPC needs finite numbers in equal, nonempty subgroups.');
  if([lsl,usl].some(x=>x!==null&&(typeof x!=='number'||!Number.isFinite(x)))||lsl!==null&&usl!==null&&usl<lsl)throw new AppError(422,'INVALID_SPC_INPUT','Invalid specification limits.');
  const k=groups.length,n=groups[0]?.length??0,raw=groups.flat(),N=raw.length;
  const means=groups.map(g=>sum(g)/n),ranges=groups.map(g=>Math.max(...g)-Math.min(...g));
  const grand_mean=k?sum(means)/k:null,rbar=k&&n>1?sum(ranges)/k:null;
  const v=variance(raw),s_overall=v===null?null:Math.sqrt(v),constants=SPC_CONSTANTS[n];
  const sigma_within=constants&&rbar!==null?rbar/constants.d2:null;
  const sigma=method==='paper_stdev_s'?s_overall:sigma_within;
  const control_limits={center_x:grand_mean,center_r:rbar,ucl_x:null,lcl_x:null,ucl_r:null,lcl_r:null};
  if(constants&&k){Object.assign(control_limits,{ucl_x:finite(grand_mean+constants.A2*rbar),lcl_x:finite(grand_mean-constants.A2*rbar),ucl_r:finite(constants.D4*rbar),lcl_r:finite(Math.max(0,constants.D3*rbar))});}
  let reason=!k?'NO_DATA':n===1?'SUBGROUP_SIZE_ONE':!constants?'UNSUPPORTED_SUBGROUP_SIZE':sigma===null||!Number.isFinite(sigma)?'INSUFFICIENT_DATA':sigma===0?'ZERO_VARIANCE':lsl===null&&usl===null?'MISSING_SPECIFICATION':lsl===null||usl===null?'ONE_SIDED_SPECIFICATION':null;
  let cp=null,cpk=null;
  if(!reason||reason==='ONE_SIDED_SPECIFICATION'){
    if(lsl!==null&&usl!==null)cp=finite((usl-lsl)/(6*sigma));
    const sides=[];if(usl!==null)sides.push((usl-grand_mean)/(3*sigma));if(lsl!==null)sides.push((grand_mean-lsl)/(3*sigma));
    if(sides.length)cpk=finite(Math.min(...sides));
    if(cp===null&&lsl!==null&&usl!==null||cpk===null)reason='NUMERIC_OVERFLOW';
  }
  for(const key of Object.keys(control_limits))control_limits[key]=finite(control_limits[key]);
  return {k,n,N,sum_raw:finite(sum(raw)),sum_xbar:finite(sum(means)),sum_r:n>1?finite(sum(ranges)):null,grand_mean:finite(grand_mean),rbar:finite(rbar),s_overall:finite(s_overall),sigma_within:finite(sigma_within),three_sigma:sigma===null?null:finite(3*sigma),six_sigma:sigma===null?null:finite(6*sigma),r_max:k&&n>1?finite(Math.max(...ranges)):null,control_limits,capability:{method,sigma:finite(sigma),cp,cpk,reason,provisional:true},reasons:[...(reason?[reason]:[]),'PERIOD_ESTIMATE','PROCESS_ASSUMPTIONS_UNVERIFIED'],constants_version:SPC_CONSTANTS_VERSION};
}
