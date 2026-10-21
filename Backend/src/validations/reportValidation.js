import {z} from 'zod';
import {id} from './sharedValidation.js';
export const reportDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const date=new Date(v+'T00:00:00Z');return Number.isFinite(date.valueOf())&&date.toISOString().slice(0,10)===v;},'Invalid calendar date.');
export const reportScope=z.object({production_date_from:reportDate,production_date_to:reportDate,line:z.string().min(1).max(64).optional(),shift:z.enum(['day','night']).optional(),definition_id:id.optional(),product_type_id:id.optional(),instrument_id:id.optional()}).strict();
const snapshot=z.string().datetime({offset:true}).optional();
export const reportInput=reportScope.extend({as_of:snapshot});
const paging={limit:z.coerce.number().int().min(1).max(100).default(25),cursor:z.string().max(2048).optional()};
export const checksheetQuery=reportInput.extend(paging);
export const spcQuery=reportInput.extend({baseline_id:id.optional()});
export const subgroupQuery=reportInput.extend({...paging,cohort_id:id,baseline_id:id.optional()});
export const summaryQuery=z.object({month:z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/),line:z.string().max(64).optional(),shift:z.enum(['day','night']).optional(),as_of:snapshot}).strict();
export const exportQuery=reportInput.extend({report_kind:z.enum(['checksheet','spc']).default('checksheet'),baseline_id:id.optional()});
export const baselineInput=z.object({scope:reportInput,cohort_id:id,method:z.enum(['paper_stdev_s','within_rbar_d2']),review_reason:z.string().trim().min(1).max(500)}).strict();

