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

  // Fetch records (ALL, including jam=0) + holidays + uang makan setting
  const [records, holidays, uangMakanSetting] = await Promise.all([
    prisma.overtimeRecord.findMany({
      where,
      include: { overtimeRule: true },
      orderBy: [{ periodStart: 'desc' }, { date: 'asc' }]
    }),
    prisma.holiday.findMany({
      where: { year: parseInt(year || String(new Date().getFullYear())), deletedAt: null }
    }),
    prisma.globalSetting.findUnique({ where: { key: 'uang_makan' } })
  ]);

  const uangMakan = parseInt(uangMakanSetting?.value || '30000');
  const holidaySet = new Set(holidays.map(h => h.date.toISOString().split('T')[0]));
  const today = new Date();
  const todayStr = toLocalDateStr(today);

  // Group records by period
  const grouped: Record<string, any> = {};

  // First: process existing records (both jam>0 and jam=0)
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

    if (hrs > 0) {
      // Real overtime
      grouped[key].records.push({
        ...record,
        isVirtual: false
      });
      grouped[key].dayCount++;
      grouped[key].totalOvertime += rounded;
    } else {
      // Existing jam=0 record (uang makan)
      grouped[key].records.push({
        ...record,
        isVirtual: false
      });
      grouped[key].totalUangMakan += rounded;
    }

    grouped[key].totalAmount = grouped[key].totalOvertime + grouped[key].totalUangMakan;
    grouped[key].totalRounded = grouped[key].totalAmount;

    if (record.status === 'cair') {
      grouped[key].status = 'cair';
    }
  }

  // Second: for each period, generate virtual entries for missing weekdays
  for (const key of Object.keys(grouped)) {
    const period = grouped[key];
    const pStart = new Date(period.periodStart);
    const pEnd = new Date(period.periodEnd);
    const existingDates = new Set(period.records.map((r: any) => toLocalDateStr(new Date(r.date))));

    let current = new Date(pStart);
    while (current <= pEnd) {
      const dateStr = toLocalDateStr(current);
      const dayOfWeek = current.getDay(); // 0=Sun, 6=Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidaySet.has(dateStr);
      const isPast = dateStr <= todayStr;

      // Only generate virtual for weekdays, not holidays, that are past/today, and not already recorded
      if (!isWeekend && !isHoliday && isPast && !existingDates.has(dateStr)) {
        period.records.push({
          id: `virtual_${dateStr}`,
          date: dateStr + 'T00:00:00.000Z',
          dayType: 'weekday',
          durationHours: 0,
          roundedAmount: uangMakan,
          status: 'belum',
          isVirtual: true,
          overtimeRule: null
        });
        period.totalUangMakan += uangMakan;
        period.totalAmount += uangMakan;
        period.totalRounded += uangMakan;
      }

      current.setDate(current.getDate() + 1);
    }

    // Sort records by date
    period.records.sort((a: any, b: any) => {
      const da = a.date instanceof Date ? a.date : new Date(a.date);
      const db = b.date instanceof Date ? b.date : new Date(b.date);
      return da.getTime() - db.getTime();
    });
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

  const rules = await prisma.overtimeRule.findMany({ where: { isActive: true } });
  const upahPerJam = gajiPokok / 173;

  const firstDate = new Date(dates[0].date);
  const periodStart = getPeriodStart(firstDate);
  const periodEnd = getPeriodEnd(firstDate);

  const created = await prisma.$transaction(async (tx) => {
    const results = [];
    for (const entry of dates) {
      const date = new Date(entry.date);
      const rule = entry.overtimeRuleId ? rules.find((r) => r.id === entry.overtimeRuleId) : null;

      if (!rule && entry.dayType !== 'weekend') {
        continue;
      }

      let dailyAmount = 0;
      if (entry.dayType === 'weekend') {
        dailyAmount = upahPerJam * 2 * Number(entry.durationHours) + uangMakan;
      } else if (rule) {
        dailyAmount = upahPerJam * Number(rule.rate) + uangMakan;
      }

      const roundedAmount = Math.round(dailyAmount / 1000) * 1000;

      const record = await tx.overtimeRecord.upsert({
        where: { userId_date: { userId, date } },
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
          deletedAt: null
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
