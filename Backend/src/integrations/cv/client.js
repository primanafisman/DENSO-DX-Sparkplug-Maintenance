import {AppError} from '../../errors/AppError.js';
export class CvClient{
  constructor(config){this.config=config;}
  async call(route,{method='GET',body,mimeType,raw=false}={}){let response;try{response=await fetch(this.config.cvUrl+'/internal/v1'+route,{method,headers:{'X-Internal-Token':this.config.internalToken,...(body?{'Content-Type':mimeType||'application/json'}:{})},body:body?(mimeType?body:JSON.stringify(body)):undefined,signal:AbortSignal.timeout(120000)});}catch{throw new AppError(503,'ENGINE_UNAVAILABLE','Local reader unavailable. Retry after checking the worker.');}if(!response.ok){throw new AppError([410,413,415,422,429].includes(response.status)?response.status:503,response.status===410?'ENGINE_EXPIRED':'ENGINE_REQUEST_FAILED','Local reader could not process this request.');}return raw?{bytes:Buffer.from(await response.arrayBuffer()),mimeType:response.headers.get('content-type')||'image/jpeg'}:response.json();}
  upload({bytes,mimeType}){return this.call('/photos',{method:'POST',body:bytes,mimeType});}
  discover({imageId,instruments,area}){return this.call(`/photos/${encodeURIComponent(imageId)}/discovery`,{method:'POST',body:{instruments,area}});}
  submit({imageId,items,instruments,area}){return this.call('/analysis-jobs',{method:'POST',body:{image_id:imageId,items,instruments,area}});}
  getJob(id){return this.call(`/analysis-jobs/${encodeURIComponent(id)}`);}
  getCrop({imageId,roi}){return this.call(`/photos/${encodeURIComponent(imageId)}/crop`,{method:'POST',body:roi,raw:true});}
  health(){return this.call('/health');}
}
