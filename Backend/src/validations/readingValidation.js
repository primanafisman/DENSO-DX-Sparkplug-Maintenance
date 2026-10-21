import {z} from 'zod';
import {id,context} from './sharedValidation.js';
export const confirmInput=z.object({analysis_id:id,instrument_id:id,final_value:z.union([z.number().finite(),z.string().regex(/^-?\d{1,9}(\.\d{1,6})?$/)]),verified:z.boolean(),identity_verified:z.boolean(),context,check_id:id,sample_key:id,reason:z.string().trim().max(500).default(''),confirmation_id:z.string().min(1).max(128)}).strict();
export const historyInput=z.object({limit:z.coerce.number().int().min(1).max(100).default(25),cursor:z.string().max(512).optional(),sort:z.enum(['created_at_desc','created_at_asc']).default('created_at_desc'),line:z.string().max(64).optional(),instrument_id:id.optional(),production_date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),shift:z.enum(['day','night']).optional(),definition_id:id.optional()}).strict();
export const readingHistory=historyInput.omit({definition_id:true});
export const maintenanceHistory=historyInput.omit({instrument_id:true});
export const instrumentHistory=historyInput.pick({limit:true,cursor:true,sort:true}).extend({q:z.string().trim().max(100).optional(),active:z.enum(['true','false']).transform(v=>v==='true').optional(),condition:z.enum(['working','not_working','unknown']).optional(),measurement_mode:z.enum(['numeric','visual']).optional()});
