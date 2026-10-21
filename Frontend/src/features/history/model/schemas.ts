import { z } from 'zod';
export const checksheetSchema = z
  .object({
    meta: z.object({ as_of: z.string(), warnings: z.array(z.string()) }).passthrough(),
    rows: z.array(
      z
        .object({
          row_id: z.string(),
          name: z.string(),
          cells: z.array(
            z.object({
              date: z.string(),
              count: z.number(),
              occurrences: z.array(z.object({ id: z.string() }).passthrough()),
            }),
          ),
        })
        .passthrough(),
    ),
    next_cursor: z.string().nullable(),
  })
  .passthrough();
