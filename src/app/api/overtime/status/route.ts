import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await req.json();
  const { periodStart, periodEnd, status } = body;

  if (!periodStart || !periodEnd || !status) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
  }

  if (!['belum', 'cair'].includes(status)) {
    return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
  }

  // Parse "YYYY-MM-DD" strings to Date range (UTC midnight)
  // periodStart/periodEnd are local date strings like "2026-06-25"
  const startDate = new Date(periodStart + 'T00:00:00.000Z');
  const endDate = new Date(periodEnd + 'T00:00:00.000Z');

  const result = await prisma.overtimeRecord.updateMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
      deletedAt: null
    },
    data: { status }
  });

  return NextResponse.json({
    data: {
      message: `Status berhasil diubah menjadi "${status}"`,
      updated: result.count
    }
  });
}
