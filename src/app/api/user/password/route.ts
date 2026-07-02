import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { changePasswordSchema } from '@/lib/validators/user';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = changePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
  }

  const isValid = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!isValid) {
    return NextResponse.json({ error: 'Password saat ini salah' }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });

  return NextResponse.json({ data: { message: 'Password berhasil diubah' } });
}
