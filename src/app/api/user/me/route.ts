import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      nik: true,
      statusKaryawan: true,
      statusPernikahan: true,
      jumlahAnak: true,
      gajiPokok: true,
      isActive: true,
      createdAt: true
    }
  });

  if (!user) {
    return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json({ data: user });
}
