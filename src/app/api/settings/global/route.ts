import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await prisma.globalSetting.findMany({
    orderBy: { key: 'asc' }
  });

  return NextResponse.json({ data: settings });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { updates } = body; // Array of { key, value }

  if (!Array.isArray(updates)) {
    return NextResponse.json({ error: 'Format tidak valid' }, { status: 400 });
  }

  for (const update of updates) {
    await prisma.globalSetting.update({
      where: { key: update.key },
      data: { value: update.value }
    });
  }

  return NextResponse.json({ data: { message: 'Pengaturan berhasil disimpan' } });
}
