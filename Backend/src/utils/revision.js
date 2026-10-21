import {createHash} from 'node:crypto';
export const revisionPrefix=entity=>'rev:'+createHash('sha256').update(JSON.stringify(entity)).digest('hex').slice(0,16)+':';
export const revisionKey=(entity,version)=>revisionPrefix(entity)+'v'+String(version).padStart(12,'0');
export async function archiveRevision(repo,{entity_id,version,value,actor_id,reason,effective_at=null,archived_at}){
  const id=revisionKey(entity_id,version);
  if(await repo.revisions.get(id))return;
  return repo.revisions.create({id,entity_id,version,value,actor_id,reason,effective_at,archived_at});
}
