import {randomUUID} from 'node:crypto';
import {AppError} from '../errors/AppError.js';
export function createPhotoService({config,cvClient,clock}){
  const photos=new Map();
  function sweep(){for(const [id,p] of photos)if(p.expires_at*1000<clock())photos.delete(id);}
  function get(id,actor){sweep();const photo=photos.get(id);if(!photo)throw new AppError(410,'PHOTO_EXPIRED','Photo expired; upload again.');if(photo.owner_id!==actor.id)throw new AppError(403,'PHOTO_FORBIDDEN','This photo belongs to another session owner.');return photo;}
  return {get,
    async upload({bytes,mimeType,context,actor}){sweep();if(!['image/jpeg','image/png','image/webp'].includes(mimeType))throw new AppError(415,'IMAGE_FORMAT','Use JPEG, PNG or WebP.');if(!bytes?.length||bytes.length>15*1024*1024)throw new AppError(413,'UPLOAD_LIMIT','Maximum upload is 15 MiB.');if([...photos.values()].reduce((n,p)=>n+p.bytes.length,0)+bytes.length>96*1024*1024)throw new AppError(429,'PHOTO_CAPACITY','Temporary photo capacity reached; retry later.');const metadata=await cvClient.upload({bytes,mimeType});const id=randomUUID();const stored={...metadata,image_id:id,private_id:metadata.image_id,owner_id:actor.id,context:structuredClone(context),bytes,mimeType,expires_at:clock()/1000+config.ttlSeconds};photos.set(id,stored);return {image_id:id,source_hash:stored.source_hash,source_width:stored.source_width,source_height:stored.source_height,preview_width:stored.preview_width,preview_height:stored.preview_height,expires_at:stored.expires_at,context:stored.context};},
    async crop(id,roi,actor){const photo=get(id,actor);return cvClient.getCrop({imageId:photo.private_id,roi});},
    close(){photos.clear();},
  };
}
