import { z } from 'zod';
export const equipmentSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    code: z.string().max(100),
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
    use_acceptance_limits: z.boolean(),
    acceptance_minimum: z.number().nullable(),
    acceptance_maximum: z.number().nullable(),
    check_ids: z.array(z.string()),
  })
  .superRefine((v, c) => {
    if (v.condition === 'unknown')
      c.addIssue({
        code: 'custom',
        path: ['condition'],
        message: 'Pilih kondisi alat: Berfungsi atau Tidak berfungsi.',
      });
    if (v.measurement_mode === 'numeric' && v.maximum <= v.minimum)
      c.addIssue({
        code: 'custom',
        path: ['maximum'],
        message: 'Maksimum harus melebihi minimum.',
      });
    if (v.measurement_mode === 'numeric' && v.use_acceptance_limits) {
      if (v.acceptance_minimum === null && v.acceptance_maximum === null)
        c.addIssue({
          code: 'custom',
          path: ['acceptance_minimum'],
          message: 'Isi minimal satu batas OK.',
        });
      if (
        v.acceptance_minimum !== null &&
        v.acceptance_maximum !== null &&
        v.acceptance_maximum < v.acceptance_minimum
      )
        c.addIssue({
          code: 'custom',
          path: ['acceptance_maximum'],
          message: 'Maksimum OK harus ≥ Minimum OK.',
        });
      for (const field of ['acceptance_minimum', 'acceptance_maximum'] as const) {
        const bound = v[field];
        if (bound !== null && (bound < v.minimum || bound > v.maximum))
          c.addIssue({
            code: 'custom',
            path: [field],
            message: 'Batas OK harus berada dalam rentang fisik alat.',
          });
      }
    }
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
