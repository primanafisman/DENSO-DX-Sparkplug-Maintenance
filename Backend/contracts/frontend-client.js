export class MaintenanceClient{
  constructor(baseUrl=''){this.baseUrl=baseUrl;this.csrfToken='';}
  async request(path,{method='GET',body}={}){const isForm=body instanceof FormData;const response=await fetch(this.baseUrl+'/api/v1'+path,{method,credentials:'include',headers:{...(!isForm&&body?{'Content-Type':'application/json'}:{}),...(['GET','HEAD'].includes(method)?{}:{'X-CSRF-Token':this.csrfToken})},body:body?(isForm?body:JSON.stringify(body)):undefined});const payload=await response.json();if(!response.ok||!payload.success){const error=new Error(payload.message||'Request failed.');error.code=payload.code;error.details=payload.details;throw error;}return payload.data;}
  async login(username,password){const user=await this.request('/auth/login',{method:'POST',body:{username,password}});this.csrfToken=(await this.request('/auth/csrf')).csrf_token;return user;}
  upload(image,context){const form=new FormData();form.append('image',image);form.append('context',JSON.stringify(context));return this.request('/photos',{method:'POST',body:form});}
  submit(image_id,items,area=''){return this.request('/analysis-jobs',{method:'POST',body:{image_id,items,area}});}
  summary(filters){return this.request('/maintenance/summary?'+new URLSearchParams(filters));}
  checksheet(filters){return this.request('/maintenance/report?'+new URLSearchParams(filters));}
  spc(filters){return this.request('/maintenance/spc?'+new URLSearchParams(filters));}
  subgroups(filters){return this.request('/maintenance/spc/subgroups?'+new URLSearchParams(filters));}
  saveBaseline(body){return this.request('/maintenance/spc-baselines',{method:'POST',body});}
}
