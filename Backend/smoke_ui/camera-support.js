export function cameraMode(secureContext,mediaDevices){return secureContext&&typeof mediaDevices?.getUserMedia==='function'?'stream':'native';}
export function confirmationId(cryptoProvider=globalThis.crypto){
  if(typeof cryptoProvider.randomUUID==='function')return cryptoProvider.randomUUID();
  const bytes=cryptoProvider.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=[...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}
