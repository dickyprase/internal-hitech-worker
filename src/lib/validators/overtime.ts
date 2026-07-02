import { z } from 'zod';

export const createOvertimeSchema = z.object({
  dates: z
    .array(
      z.object({
        date: z.string(),
        dayType: z.enum(['weekday', 'weekend', 'holiday']),
        overtimeRuleId: z.number().nullable(),
        durationHours: z.number(),
        isFriday: z.boolean().default(false)
      })
    )
    .min(1, 'Minimal satu hari lembur'),
  gajiPokok: z.number().min(0),
  uangMakan: z.number().min(0)
});
