import { z } from 'zod';
export const equipmentSchema = z
  .object({
    name: z.string().trim().min(1),
    code: z.string(),
    aliases: z.string(),
    area: z.string(),
    instrument_type: z.enum([
      'pressure_gauge',
      'caliper',
      'height_gauge',
      'gasket_gauge',
      'dial_indicator',
      'other',
    ]),
    active: z.boolean(),
    measurement_mode: z.enum(['numeric', 'visual']),
    condition: z.enum(['working', 'not_working', 'unknown']),
    condition_reason: z.string(),
    kind: z.enum(['auto', 'digital', 'analog']),
    unit: z.enum(['MPa', 'mm', 'kN', 'N', 'bar']),
    minimum: z.number(),
    maximum: z.number(),
    decimals: z.number().int().min(0).max(6),
    tolerance: z.number().positive().max(1),
    check_ids: z.array(z.string()),
  })
  .superRefine((v, c) => {
    if (v.measurement_mode === 'numeric' && v.maximum <= v.minimum)
      c.addIssue({
        code: 'custom',
        path: ['maximum'],
        message: 'Maksimum harus melebihi minimum.',
      });
    if (
      v.measurement_mode === 'numeric' &&
      v.kind === 'analog' &&
      (v.unit !== 'MPa' || v.minimum !== 0 || v.maximum !== 1)
    )
      c.addIssue({ code: 'custom', path: ['kind'], message: 'Analog mendukung 0–1 MPa.' });
  });
export type EquipmentForm = z.infer<typeof equipmentSchema>;
export const instrumentPageSchema = z.object({
  items: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()),
  next_cursor: z.string().nullable(),
});
