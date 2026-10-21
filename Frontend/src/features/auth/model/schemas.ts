import {z} from 'zod';
export const loginSchema=z.object({username:z.string().trim().min(1,'Isi User ID'),password:z.string().min(1,'Isi kata sandi')});
export type LoginInput=z.infer<typeof loginSchema>;
