import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');
  const type = searchParams.get('type');

  const where: any = { deletedAt: null };
  if (year) where.year = parseInt(year);
  if (type) where.type = type;

  const holidays = await prisma.holiday.findMany({
    where,
    orderBy: { date: 'asc' }
  });

  return NextResponse.json({ data: holidays });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { date, name, type } = body;

  if (!date || !name || !type) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
  }

  const holidayDate = new Date(date);
  const year = holidayDate.getFullYear();

  const holiday = await prisma.holiday.create({
    data: { date: holidayDate, name, type, year }
  });

  // If cuti_bersama, cut all active users' leave balance
  if (type === 'cuti_bersama') {
    const activeUsers = await prisma.user.findMany({
      where: { isActive: true },
      include: {
        leaveBalances: {
          where: { year }
        }
      }
    });

    for (const user of activeUsers) {
      const balance = user.leaveBalances[0];
      if (balance) {
        await prisma.$transaction(async (tx) => {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              cutiBersamaCut: balance.cutiBersamaCut + 1,
              remaining: balance.remaining - 1
            }
          });

          await tx.leaveTransaction.create({
            data: {
              userId: user.id,
              leaveBalanceId: balance.id,
              date: holidayDate,
              type: 'cuti_bersama_cut',
              amount: 1,
              description: `Cuti Bersama: ${name}`,
              refHolidayId: holiday.id
            }
          });
        });
      }
    }
  }

  return NextResponse.json({ data: holiday }, { status: 201 });
}
