import { z } from 'zod';
export const summarySchema = z
  .object({
    total: z.number().int().nonnegative(),
    ok: z.number().int().nonnegative(),
    ng: z.number().int().nonnegative(),
    ok_ratio: z.number().nullable(),
    meta: z.object({ as_of: z.string(), warnings: z.array(z.string()) }).passthrough(),
    daily: z.array(z.object({ date: z.string(), ok: z.number(), ng: z.number() })),
    groups: z.array(
      z.object({
        definition_id: z.string(),
        name: z.string(),
        check_number: z.number().int().positive().nullable().optional(),
        total: z.number(),
        ok: z.number(),
        ng: z.number(),
        latest_checked_at: z.string().nullable().optional(),
      }),
    ),
  })
  .passthrough();
