import { z } from 'zod';
export const settingsSchema = z.object({
  lines: z.array(z.string()),
  allowed_samplers: z.array(z.string()),
  inactive_lines: z.array(z.string()).optional(),
  inactive_samplers: z.array(z.string()).optional(),
  night_rollover_hour: z.number().int(),
  shift_schedule: z
    .object({ day: z.tuple([z.string(), z.string()]), night: z.tuple([z.string(), z.string()]) })
    .optional(),
  product_types: z
    .array(
      z.object({
        id: z.string(),
        code: z.string(),
        name: z.string(),
        active: z.boolean(),
        version: z.number(),
      }),
    )
    .optional(),
});
export const definitionFormSchema = z.object({
  check_number: z
    .number({ error: 'Isi nomor pemeriksaan.' })
    .int('Nomor pemeriksaan harus bilangan bulat.')
    .min(1, 'Nomor pemeriksaan minimal 1.')
    .max(10000, 'Nomor pemeriksaan maksimal 10000.'),
  inspection_target: z.enum(['machine', 'product'], { error: 'Pilih sasaran pemeriksaan.' }),
  name: z.string().trim().min(1),
  standard_text: z.string().trim().min(1),
  method_text: z.string().trim().min(1),
  tool: z.string().trim().min(1),
  kind: z.enum(['visual', 'functional', 'numeric', 'difference']),
  unit: z.enum(['MPa', 'mm', 'kN', 'N', 'bar']),
  minimum: z.number(),
  maximum: z.number(),
  sample_count: z.number().int().min(1).max(20),
  interval: z.enum(['per_shift', 'weekly', 'every_4_hours', 'daily']),
  description: z.string().min(1),
});
export type DefinitionForm = z.infer<typeof definitionFormSchema>;
