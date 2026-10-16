import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
test('discovery supplies automatic profiles and registered equipment keeps authoritative limits',async()=>{
  const {suggestDiscoveryProfile}=await import('../src/services/discoveryProfile.js');
  const lcd=suggestDiscoveryProfile({kind_hint:'digital',display_type:'lcd',observed_decimals:2},[]);
  assert.equal(lcd.suggested_profile.unit,'mm');assert.equal(lcd.suggested_profile.kind,'digital');assert.equal(lcd.suggested_profile.decimals,2);assert.equal(lcd.requires_profile_confirmation,true);
  const pressure=suggestDiscoveryProfile({kind_hint:'digital',display_type:'green-led'},[]);
  assert.equal(pressure.suggested_profile.unit,'MPa');assert.equal(pressure.suggested_profile.maximum,1);
  const registered={id:'tool-1',profile:{kind:'digital',unit:'mm',minimum:-10,maximum:25,decimals:3,tolerance:.002}};
  const matched=suggestDiscoveryProfile({kind_hint:'digital',display_type:'green-led',instrument:{id:'tool-1',profile:{unit:'MPa'}}},[registered]);
  assert.deepEqual(matched.suggested_profile,registered.profile);assert.equal(matched.profile_source,'registered-equipment');
});
test('LAN HTTP camera uses native capture and confirmation IDs work without secure-context randomUUID',async()=>{
  const {cameraMode,confirmationId}=await import('../smoke_ui/camera-support.js');
  assert.equal(cameraMode(false,{getUserMedia(){}}),'native');
  assert.equal(cameraMode(true,{getUserMedia(){}}),'stream');
  assert.equal(cameraMode(true,undefined),'native');
  const portable={getRandomValues:array=>webcrypto.getRandomValues(array)};
  const first=confirmationId(portable),second=confirmationId(portable);
  assert.match(first,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);assert.notEqual(first,second);
});
