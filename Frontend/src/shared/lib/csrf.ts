let token='';let pending:Promise<string>|undefined;
export function resetCsrf(){token='';pending=undefined;}
export async function csrfToken(load:()=>Promise<string>){if(token)return token;pending??=load().then(value=>token=value).finally(()=>{pending=undefined;});return pending;}
