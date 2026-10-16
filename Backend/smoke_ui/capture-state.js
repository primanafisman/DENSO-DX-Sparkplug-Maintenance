function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
export function createCaptureState(){let version=0;return {
  invalidate(){version+=1;},
  begin(input){const token={version:++version,capture:freeze(structuredClone(input))};return Object.freeze(token);},
  current(token){return token?.version===version;},
  finish(token,result){return token?.version===version?{capture:token.capture,result}:null;},
};}
