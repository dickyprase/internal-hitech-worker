import { z } from 'zod';

export const createLeaveSchema = z.object({
  date: z.string(),
  amount: z.number().int().min(1, 'Minimal 1 hari'),
  description: z.string().min(1, 'Keterangan wajib diisi')
});

export const createHolidaySchema = z.object({
  date: z.string(),
  name: z.string().min(1, 'Nama hari libur wajib diisi'),
  type: z.enum(['national', 'cuti_bersama'])
});
