import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  nik: z.string().optional(),
  statusKaryawan: z.enum(['tetap', 'kontrak']).optional(),
  statusPernikahan: z.enum(['single', 'married']).optional(),
  jumlahAnak: z.number().int().min(0).optional(),
  gajiPokok: z.number().min(0).optional()
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
    newPassword: z.string().min(8, 'Password baru minimal 8 karakter'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi')
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword']
  });
