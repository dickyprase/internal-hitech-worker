import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPeriodStart, getPeriodEnd, toLocalDateStr } from '@/lib/period';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  const where: any = { userId, deletedAt: null };

  if (month && year) {
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    where.date = { gte: startDate, lte: endDate };
  }

  const records = await prisma.overtimeRecord.findMany({
    where,
    include: { overtimeRule: true },
    orderBy: [{ periodStart: 'desc' }, { date: 'asc' }]
  });

  // Group by period using utility (Kamis–Rabu), format pakai zona lokal
  const grouped = records.reduce(
    (acc, record) => {
      const recordDate = new Date(record.date);
      const pStart = getPeriodStart(recordDate);
      const pEnd = getPeriodEnd(recordDate);
      const key = `${toLocalDateStr(pStart)}_${toLocalDateStr(pEnd)}`;

      if (!acc[key]) {
        acc[key] = {
          periodStart: toLocalDateStr(pStart),
          periodEnd: toLocalDateStr(pEnd),
          records: [],
          totalAmount: 0,
          totalRounded: 0,
          status: 'belum',
          dayCount: 0
        };
      }
      acc[key].records.push(record);
      const hrs = Number(record.durationHours);
      const amt = Number(record.dailyAmount);
      const rnd = Number(record.roundedAmount);

      // Only count actual overtime (jam > 0) as "hari aktif lembur"
      if (hrs > 0) {
        acc[key].dayCount++;
        acc[key].totalAmount += amt;
        acc[key].totalRounded += rnd;
      } else {
        // Default attendance record — track uang makan separately
        acc[key].uangMakanTotal = (acc[key].uangMakanTotal || 0) + rnd;
      }

      if (record.status === 'cair') {
        acc[key].status = 'cair';
      }
      return acc;
    },
    {} as Record<string, any>
  );

  return NextResponse.json({ data: Object.values(grouped) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await req.json();
  const { dates, gajiPokok, uangMakan } = body;

  if (!dates || !Array.isArray(dates) || dates.length === 0) {
    return NextResponse.json({ error: 'Data lembur tidak valid' }, { status: 400 });
  }

  const rules = await prisma.overtimeRule.findMany({ where: { isActive: true } });
  const upahPerJam = gajiPokok / 173;

  // Calculate period from first date using utility
  const firstDate = new Date(dates[0].date);
  const periodStart = getPeriodStart(firstDate);
  const periodEnd = getPeriodEnd(firstDate);

  const created = await prisma.$transaction(async (tx) => {
    const results = [];
    for (const entry of dates) {
      const date = new Date(entry.date);
      const rule = entry.overtimeRuleId ? rules.find((r) => r.id === entry.overtimeRuleId) : null;

      let dailyAmount = 0;
      if (entry.dayType === 'weekend') {
        dailyAmount = upahPerJam * 2 * Number(entry.durationHours) + uangMakan;
      } else if (rule) {
        dailyAmount = upahPerJam * Number(rule.rate) + uangMakan;
      } else if (entry.dayType === 'weekday') {
        // Tidak Lembur (Uang Makan Saja)
        dailyAmount = uangMakan;
      }

      const roundedAmount = Math.round(dailyAmount / 1000) * 1000;

      // UPSERT: update if exists, create if not
      const record = await tx.overtimeRecord.upsert({
        where: {
          userId_date: { userId, date }
        },
        update: {
          dayType: entry.dayType,
          isFriday: entry.isFriday || false,
          overtimeRuleId: entry.overtimeRuleId || null,
          durationHours: entry.durationHours,
          rateSnapshot: rule ? Number(rule.rate) : entry.dayType === 'weekend' ? 2 : 0,
          gajiSnapshot: gajiPokok,
          uangMakanSnapshot: uangMakan,
          dailyAmount,
          roundedAmount,
          periodStart,
          periodEnd,
          deletedAt: null // un-soft-delete if was deleted
        },
        create: {
          userId,
          date,
          dayType: entry.dayType,
          isFriday: entry.isFriday || false,
          overtimeRuleId: entry.overtimeRuleId || null,
          durationHours: entry.durationHours,
          rateSnapshot: rule ? Number(rule.rate) : entry.dayType === 'weekend' ? 2 : 0,
          gajiSnapshot: gajiPokok,
          uangMakanSnapshot: uangMakan,
          dailyAmount,
          roundedAmount,
          periodStart,
          periodEnd,
          status: 'belum'
        }
      });
      results.push(record);
    }
    return results;
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
