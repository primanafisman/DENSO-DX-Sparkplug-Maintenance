import { z } from 'zod';
export const contextFormSchema = z.object({
  line: z.string().trim().min(1, 'Pilih line terlebih dahulu'),
  sampler: z.string().trim().min(1, 'Isi sampler'),
  product_type_id: z.string().optional(),
});
