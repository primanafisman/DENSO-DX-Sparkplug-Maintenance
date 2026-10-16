import {z} from 'zod';
export const loginSchema=z.object({username:z.string().trim().min(1).max(64),password:z.string().min(1).max(72).refine(value=>Buffer.byteLength(value,'utf8')<=72,'Password exceeds bcrypt UTF-8 byte limit.')}).strict();
