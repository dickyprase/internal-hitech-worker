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

  // Fetch ALL records from DB (jam=0 and jam>0) — Single Source of Truth
  const records = await prisma.overtimeRecord.findMany({
    where,
    include: { overtimeRule: true },
    orderBy: [{ periodStart: 'desc' }, { date: 'asc' }]
  });

  // Group by period
  const grouped: Record<string, any> = {};

  for (const record of records) {
    const recordDate = new Date(record.date);
    const pStart = getPeriodStart(recordDate);
    const pEnd = getPeriodEnd(recordDate);
    const key = `${toLocalDateStr(pStart)}_${toLocalDateStr(pEnd)}`;

    if (!grouped[key]) {
      grouped[key] = {
        periodStart: toLocalDateStr(pStart),
        periodEnd: toLocalDateStr(pEnd),
        records: [],
        totalOvertime: 0,
        totalUangMakan: 0,
        totalAmount: 0,
        totalRounded: 0,
        status: 'belum',
        dayCount: 0
      };
    }

    const hrs = Number(record.durationHours);
    const rounded = Number(record.roundedAmount);

    grouped[key].records.push(record);

    if (hrs > 0) {
      grouped[key].dayCount++;
      grouped[key].totalOvertime += rounded;
    } else {
      grouped[key].totalUangMakan += rounded;
    }

    grouped[key].totalAmount = grouped[key].totalOvertime + grouped[key].totalUangMakan;
    grouped[key].totalRounded = grouped[key].totalAmount;

    if (record.status === 'cair') {
      grouped[key].status = 'cair';
    }
  }

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

  // Fetch uang_makan from DB if not provided
  let uangMakanValue = uangMakan;
  if (!uangMakanValue) {
    const setting = await prisma.globalSetting.findUnique({ where: { key: 'uang_makan' } });
    uangMakanValue = parseInt(setting?.value || '30000');
  }

  const rules = await prisma.overtimeRule.findMany({ where: { isActive: true } });
  const upahPerJam = (gajiPokok || 0) / 173;

  const firstDate = new Date(dates[0].date);
  const periodStart = getPeriodStart(firstDate);
  const periodEnd = getPeriodEnd(firstDate);

  const created = await prisma.$transaction(async (tx) => {
    const results = [];
    for (const entry of dates) {
      const date = new Date(entry.date);
      const rule = entry.overtimeRuleId ? rules.find((r) => r.id === entry.overtimeRuleId) : null;
      const isWeekend = entry.dayType === 'weekend';

      let dailyAmount = 0;
      let durationHours = Number(entry.durationHours || 0);

      if (isWeekend && durationHours > 0) {
        // Weekend with overtime
        dailyAmount = upahPerJam * 2 * durationHours + uangMakanValue;
      } else if (rule) {
        // Weekday with overtime
        dailyAmount = upahPerJam * Number(rule.rate) + uangMakanValue;
        durationHours = Number(rule.durationHours);
      } else {
        // No overtime (Tidak Lembur) — save uang makan only
        dailyAmount = uangMakanValue;
        durationHours = 0;
      }

      const roundedAmount = Math.round(dailyAmount / 1000) * 1000;

      // UPSERT: always save to DB (jam=0 gets uang_makan, jam>0 gets full amount)
      const record = await tx.overtimeRecord.upsert({
        where: { userId_date: { userId, date } },
        update: {
          dayType: entry.dayType || 'weekday',
          isFriday: entry.isFriday || false,
          overtimeRuleId: entry.overtimeRuleId || null,
          durationHours,
          rateSnapshot: rule ? Number(rule.rate) : isWeekend ? 2 : 0,
          gajiSnapshot: gajiPokok || 0,
          uangMakanSnapshot: uangMakanValue,
          dailyAmount,
          roundedAmount,
          periodStart,
          periodEnd,
          deletedAt: null
        },
        create: {
          userId,
          date,
          dayType: entry.dayType || 'weekday',
          isFriday: entry.isFriday || false,
          overtimeRuleId: entry.overtimeRuleId || null,
          durationHours,
          rateSnapshot: rule ? Number(rule.rate) : isWeekend ? 2 : 0,
          gajiSnapshot: gajiPokok || 0,
          uangMakanSnapshot: uangMakanValue,
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
