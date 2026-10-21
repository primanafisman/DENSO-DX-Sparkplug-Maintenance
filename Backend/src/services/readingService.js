import {randomUUID,createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import {AppError} from '../errors/AppError.js';
import {confirmInput} from '../validations/readingValidation.js';
import {publicReading} from '../sanitizers/readingSanitizer.js';
import {assertNumericEquipment} from './equipmentPolicy.js';
import {compatibleProfile} from './profileCompatibility.js';
export function createReadingService({config,repositories,clock},analyses,photos){
  const evidenceRoot=path.join(config.runtimeDir,'evidence');
  return {
    async confirm(raw,actor){const parsed=confirmInput.safeParse(raw);if(!parsed.success)throw new AppError(422,'CONFIRM_INVALID','Check confirmation fields.');const input=parsed.data;
      if(!input.verified||!input.identity_verified)throw new AppError(422,'VERIFICATION_REQUIRED','Verify equipment identity and final value.');
      const fingerprint=createHash('sha256').update(JSON.stringify({input,actor_id:actor.id})).digest('hex');const previous=await repositories.readings.getByConfirmation(input.confirmation_id);if(previous){if(previous.request_fingerprint!==fingerprint)throw new AppError(409,'CONFIRMATION_CONFLICT','Confirmation ID already used with different data.');return publicReading(previous);}
      const {confirmation_id,...bindingInput}=input;
      const bindingFingerprint=createHash('sha256').update(JSON.stringify({input:bindingInput,actor_id:actor.id})).digest('hex');
      const bound=await repositories.readings.getByAnalysis(input.analysis_id);
      if(bound){if(bound.analysis_binding_fingerprint!==bindingFingerprint)throw new AppError(409,'ANALYSIS_ALREADY_CONFIRMED','Analysis already bound to another value, context or check/sample.');return publicReading(bound);}
      const snapshot=analyses.getResult(input.analysis_id,actor),asset=await repositories.instruments.get(input.instrument_id);
      if(!asset?.active)throw new AppError(422,'INSTRUMENT_UNAVAILABLE','Select active registered equipment.');
      assertNumericEquipment(asset);
      const identityChanged=!!snapshot.submitted.instrument_id&&snapshot.submitted.instrument_id!==input.instrument_id;
      if(identityChanged&&(!input.equipment_reassigned||snapshot.submitted.calibration_id))throw new AppError(422,'IDENTITY_CONFLICT','Selected equipment differs from the analysis identity or its calibration.');
      const profileMatches=isDeepStrictEqual(asset.profile,snapshot.submitted.profile)||input.equipment_reassigned&&!snapshot.submitted.calibration_id&&compatibleProfile(snapshot.submitted.profile,asset.profile,snapshot.result.candidate?.kind);
      if(!profileMatches||snapshot.instrument_snapshot?.id===asset.id&&snapshot.instrument_snapshot.revision!==asset.revision||input.instrument_revision!==undefined&&input.instrument_revision!==asset.revision)throw new AppError(409,'PROFILE_CHANGED','Equipment changed after analysis. Analyze again.');
      if(!isDeepStrictEqual(input.context,snapshot.context))throw new AppError(422,'CONTEXT_CONFLICT','Production context differs from the photo context.');
      if(!asset.maintenance_check_ids.includes(input.check_id))throw new AppError(422,'CHECK_EQUIPMENT_CONFLICT','Equipment is not linked to this maintenance check.');
      const value=Number(input.final_value),profile=asset.profile;if(!Number.isFinite(value)||value<profile.minimum||value>profile.maximum||Math.abs(value-Number(value.toFixed(profile.decimals)))>1e-8)throw new AppError(422,'VALUE_INVALID','Value is outside equipment range or display precision.');
      const result=snapshot.result;
      const storedAnalysis=input.equipment_reassigned?{...result,equipment_selection:{original_instrument_id:snapshot.submitted.instrument_id??null,original_profile:snapshot.submitted.profile,original_revision:snapshot.instrument_snapshot?.revision??null,selected_instrument_id:asset.id,selected_revision:asset.revision,operator_verified:true}}:result;
      const corrected=!result.confidence?.valid||result.validated_prediction===null||Math.abs(Number(result.candidate?.value)-value)>1e-8;
      if(corrected&&!input.reason)throw new AppError(422,'REASON_REQUIRED','Provide a correction/review reason.');
      const readingId=randomUUID(),source=snapshot.photo;const hash=createHash('sha256').update(source.bytes).digest('hex');if(hash!==source.source_hash)throw new AppError(409,'EVIDENCE_CHANGED','Photo evidence hash differs. Upload again.');
      // A recrop of one capture is still the same equipment sample.
      const evidenceKey=createHash('sha256').update(JSON.stringify({source_hash:hash,instrument_id:asset.id})).digest('hex');
      if(await repositories.readings.getByEvidence(evidenceKey))throw new AppError(409,'EVIDENCE_ALREADY_CONFIRMED','Photo/crop evidence already used; capture a new measurement sample.');
      const crop=await photos.crop(source.image_id,snapshot.submitted.roi,actor);await fs.mkdir(evidenceRoot,{recursive:true});const originalFile=readingId+'.original',cropFile=readingId+'.crop';const files=[path.join(evidenceRoot,originalFile),path.join(evidenceRoot,cropFile)];
      try{await fs.writeFile(files[0],source.bytes,{flag:'wx'});await fs.writeFile(files[1],crop.bytes,{flag:'wx'});const saved=await repositories.transaction(async tx=>{const record=await tx.readings.createConfirmed({id:readingId,confirmation_id:input.confirmation_id,request_fingerprint:fingerprint,analysis_binding_fingerprint:bindingFingerprint,evidence_key:evidenceKey,analysis_id:input.analysis_id,instrument_id:asset.id,instrument_snapshot:asset,profile_snapshot:profile,calibration_snapshot:snapshot.submitted.calibration_id?{id:snapshot.submitted.calibration_id,template_hash:snapshot.submitted.calibration?.template_hash??null}:null,final_value:value.toFixed(profile.decimals),raw_prediction:result.candidate?.value??null,corrected,reason:input.reason,context:input.context,product_snapshot:source.product_snapshot??null,check_id:input.check_id,sample_key:input.sample_key,actor_id:actor.id,confirmed_at:new Date(clock()).toISOString(),analysis:storedAnalysis,evidence:{original_file:originalFile,crop_file:cropFile,source_hash:hash,original_mime:source.mimeType,crop_mime:crop.mimeType}});await tx.audit.append({actor_id:actor.id,action:'reading_confirmed',entity_id:record.id,corrected});return record;});return publicReading(saved);}catch(err){await Promise.all(files.map(f=>fs.rm(f,{force:true})));const raced=await repositories.readings.getByConfirmation(input.confirmation_id);if(raced&&raced.request_fingerprint===fingerprint)return publicReading(raced);if(raced)throw new AppError(409,'CONFIRMATION_CONFLICT','Confirmation ID already used with different data.');const analysisRace=await repositories.readings.getByAnalysis(input.analysis_id);if(analysisRace){if(analysisRace.analysis_binding_fingerprint===bindingFingerprint)return publicReading(analysisRace);throw new AppError(409,'ANALYSIS_ALREADY_CONFIRMED','Analysis already bound to another value, context or check/sample.');}if(await repositories.readings.getByEvidence(evidenceKey))throw new AppError(409,'EVIDENCE_ALREADY_CONFIRMED','Photo/crop evidence already used; capture a new measurement sample.');throw err;}
    },
    async list(input){const {limit,cursor,sort,...filters}=input;const page=await repositories.readings.list({limit,cursor,sort,filters});return {...page,items:page.items.map(publicReading)};},
    async evidence(id,variant){if(!['original','crop'].includes(variant))throw new AppError(422,'EVIDENCE_VARIANT','Choose original or crop.');const reading=await repositories.readings.get(id);if(!reading?.evidence)throw new AppError(404,'EVIDENCE_NOT_FOUND','Evidence not found.');const filename=reading.evidence[variant+'_file'];if(!/^[a-f0-9-]{36}\.(original|crop)$/.test(filename))throw new AppError(500,'EVIDENCE_INVALID','Evidence could not be retrieved.');return {bytes:await fs.readFile(path.join(evidenceRoot,filename)),mimeType:reading.evidence[variant+'_mime']};},
  };
}
