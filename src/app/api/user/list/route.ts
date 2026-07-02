import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      nik: true,
      statusKaryawan: true,
      isActive: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ data: users });
}
