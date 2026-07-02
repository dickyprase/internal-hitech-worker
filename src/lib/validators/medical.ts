import { z } from 'zod';

export const createMedicalClaimSchema = z.object({
  type: z.enum(['mc', 'ri']),
  date: z.string(),
  amount: z.number().min(0),
  description: z.string().min(1, 'Deskripsi wajib diisi'),
  notes: z.string().optional()
});
