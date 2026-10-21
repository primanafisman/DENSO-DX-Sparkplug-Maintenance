export function suggestDiscoveryProfile(proposal,instruments){
  const asset=instruments.find(item=>item.id===proposal.instrument?.id&&item.active!==false&&item.measurement_mode!=='visual'&&item.condition!=='not_working'&&item.profile);
  if(asset)return {...proposal,instrument:structuredClone(asset),suggested_profile:structuredClone(asset.profile),profile_source:'registered-equipment',requires_profile_confirmation:true};
  const analog=proposal.kind_hint==='analog';
  if(!analog&&!(proposal.kind_hint==='digital'&&['lcd','green-led'].includes(proposal.display_type)))return {...proposal,suggested_profile:null,profile_source:'manual-required',requires_profile_confirmation:true};
  const observed=['MPa','mm','kN','N','bar'].includes(proposal.observed_unit)?proposal.observed_unit:null;
  const unit=analog?'MPa':observed||(proposal.display_type==='green-led'?'MPa':'mm');
  const decimals=analog?3:Number.isInteger(proposal.observed_decimals)&&proposal.observed_decimals>=0&&proposal.observed_decimals<=4?proposal.observed_decimals:unit==='MPa'?3:2;
  return {...proposal,suggested_profile:{kind:analog?'analog':'digital',unit,minimum:0,maximum:{MPa:1,mm:600,kN:100,N:100000,bar:10}[unit],decimals,tolerance:unit==='MPa'?.01:.02},profile_source:observed&&!analog?'observed-unit-default-range':'display-default',requires_profile_confirmation:true};
}
