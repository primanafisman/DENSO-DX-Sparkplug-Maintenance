import { z } from 'zod';
const value = z.string().parse(import.meta.env.VITE_API_BASE_URL ?? '');
export const apiBase = import.meta.env.PROD ? '/api/v1' : value || '/api/v1';
