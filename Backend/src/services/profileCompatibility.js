import {isDeepStrictEqual} from 'node:util';
// Auto only changes routing. Physical scale, unit and precision must remain identical.
export function compatibleProfile(source,target,kind){
  if(isDeepStrictEqual(source,target))return true;
  if(!source||!target||source.kind!=='auto'&&target.kind!=='auto')return false;
  const {kind:a,...physicalA}=source,{kind:b,...physicalB}=target;
  return (a==='auto'?b:a)===kind&&['digital','analog'].includes(kind)&&isDeepStrictEqual(physicalA,physicalB);
}
