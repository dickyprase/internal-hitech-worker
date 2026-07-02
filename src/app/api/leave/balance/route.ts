import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const currentYear = new Date().getFullYear();

  // Hitung total cuti bersama dari tabel holidays
  const cutiBersama = await prisma.holiday.findMany({
    where: {
      year: currentYear,
      type: 'cuti_bersama',
      deletedAt: null
    },
    orderBy: { date: 'asc' }
  });
  const totalCutiBersama = cutiBersama.length;

  // Get global settings untuk default quota
  const quotaSetting = await prisma.globalSetting.findUnique({
    where: { key: 'leave_default_quota' }
  });
  const defaultQuota = parseInt(quotaSetting?.value || '12');

  // Get or create balance
  let balance = await prisma.leaveBalance.findUnique({
    where: { userId_year: { userId, year: currentYear } }
  });

  if (!balance) {
    const realQuota = Math.max(0, defaultQuota - totalCutiBersama);
    balance = await prisma.leaveBalance.create({
      data: {
        userId,
        year: currentYear,
        totalQuota: defaultQuota,
        cutiBersamaCut: totalCutiBersama,
        used: 0,
        remaining: realQuota,
        expiresAt: new Date(currentYear + 1, 5, 30)
      }
    });
  } else {
    // Update cutiBersamaCut jika berubah
    if (balance.cutiBersamaCut !== totalCutiBersama) {
      const newRemaining = Math.max(0, balance.totalQuota - totalCutiBersama - balance.used);
      balance = await prisma.leaveBalance.update({
        where: { id: balance.id },
        data: {
          cutiBersamaCut: totalCutiBersama,
          remaining: newRemaining
        }
      });
    }
  }

  const realQuota = Math.max(0, balance.totalQuota - balance.cutiBersamaCut);

  return NextResponse.json({
    data: {
      ...balance,
      realQuota,
      totalCutiBersama,
      cutiBersamaList: cutiBersama.map((h) => ({
        id: h.id,
        date: h.date.toISOString().split('T')[0],
        name: h.name
      }))
    }
  });
}
