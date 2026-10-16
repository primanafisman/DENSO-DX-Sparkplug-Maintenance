import {randomUUID,createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {AppError} from '../errors/AppError.js';
import {instrumentInput,calibrationInput} from '../validations/instrumentValidation.js';
import {publicCalibration} from '../sanitizers/calibrationSanitizer.js';
function check(schema,input){const parsed=schema.safeParse(input);if(!parsed.success)throw new AppError(422,'VALIDATION_ERROR','Check equipment/calibration fields.');return parsed.data;}
export function createInstrumentService({config,repositories,clock},photos){return {
  list:input=>repositories.instruments.list(input),
  async get(id){const asset=await repositories.instruments.get(id);if(!asset)throw new AppError(404,'INSTRUMENT_NOT_FOUND','Equipment not found.');return asset;},
  async create(input,actor){const data=check(instrumentInput,input);return repositories.transaction(async tx=>{const saved=await tx.instruments.create({...data,revision:1});await tx.audit.append({actor_id:actor.id,action:'instrument_created',entity_id:saved.id});return saved;});},
  async update(id,input,actor){const data=check(instrumentInput,input);return repositories.transaction(async tx=>{const previous=await tx.instruments.get(id);if(!previous)throw new AppError(404,'INSTRUMENT_NOT_FOUND','Equipment not found.');const saved=await tx.instruments.update(id,{...data,revision:previous.revision+1});await tx.audit.append({actor_id:actor.id,action:'instrument_updated',entity_id:id,revision:saved.revision});return saved;});},
  async calibrations(id){return repositories.calibrations.list({limit:100,filters:{instrument_id:id}});},
  async createCalibration(id,input,actor){const data=check(calibrationInput,input),asset=await this.get(id);if(!asset.active||asset.profile.unit!=='MPa'||asset.profile.kind==='digital')throw new AppError(422,'CALIBRATION_UNSUPPORTED','Calibration requires active 0–1 MPa analog equipment.');const photo=photos.get(data.image_id,actor),crop=await photos.crop(data.image_id,data.roi,actor);
    const w=photo.source_width*data.roi.width,h=photo.source_height*data.roi.height;const radii=data.scale_points.map(p=>Math.hypot((p.x-data.pivot.x)*w,(p.y-data.pivot.y)*h));const angles=data.scale_points.map(p=>Math.atan2((p.y-data.pivot.y)*h,(p.x-data.pivot.x)*w)*180/Math.PI);const steps=angles.slice(1).map((a,i)=>((data.clockwise?1:-1)*(a-angles[i])+720)%360);
    if(Math.min(...radii)<Math.min(w,h)*.15||Math.max(...radii)/Math.min(...radii)>1.35||Math.min(...steps)<3||Math.max(...steps)>175||steps.reduce((a,b)=>a+b,0)>350)throw new AppError(422,'CALIBRATION_GEOMETRY','Pivot and scale landmarks must follow the actual dial.');
    const calibrationId=randomUUID(),hash=createHash('sha256').update(crop.bytes).digest('hex');const engine_snapshot={id:calibrationId,instrument_id:id,pivot:data.pivot,scale_points:data.scale_points,clockwise:data.clockwise,unit:asset.profile.unit,minimum:asset.profile.minimum,maximum:asset.profile.maximum,resolution:data.resolution,template_hash:hash,template_base64:crop.bytes.toString('base64')};
    return repositories.transaction(async tx=>{const saved=await tx.calibrations.create({id:calibrationId,instrument_id:id,version:clock(),profile_snapshot:asset.profile,source_hash:photo.source_hash,template_hash:hash,engine_snapshot});await tx.audit.append({actor_id:actor.id,action:'calibration_created',entity_id:calibrationId});return publicCalibration(saved);});
  },
};}
