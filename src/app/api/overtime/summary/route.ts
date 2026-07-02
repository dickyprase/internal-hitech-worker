import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const records = await prisma.overtimeRecord.findMany({
    where: {
      userId,
      deletedAt: null,
      date: { gte: monthStart, lte: monthEnd }
    }
  });

  const totalRounded = records.reduce((sum, r) => sum + Number(r.roundedAmount), 0);
  const totalDays = records.length;

  return NextResponse.json({
    data: {
      totalAmount: totalRounded,
      totalDays,
      month: now.getMonth() + 1,
      year: now.getFullYear()
    }
  });
}
