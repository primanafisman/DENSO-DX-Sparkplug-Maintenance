import {z} from 'zod';
export const jobSchema=z.object({job_id:z.string(),status:z.enum(['queued','running','completed','failed','expired']),processed:z.number(),total:z.number(),results:z.array(z.object({analysis_id:z.string(),client_id:z.string()}).passthrough()),expires_at:z.number()});
export const reviewSchema=z.object({final_value:z.string().trim().regex(/^-?\d{1,9}(?:\.\d{1,6})?$/,'Isi angka yang valid.'),identity_verified:z.literal(true,{error:'Konfirmasi identitas alat.'}),verified:z.literal(true,{error:'Konfirmasi hasil ukur.'}),reason:z.string().trim().max(500)});
