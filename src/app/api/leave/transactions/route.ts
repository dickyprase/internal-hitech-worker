import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  const transactions = await prisma.leaveTransaction.findMany({
    where,
    include: { leaveType: true, refHoliday: true },
    orderBy: { date: 'desc' }
  });

  return NextResponse.json({ data: transactions });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const body = await req.json();
  const { dates, leaveTypeId, description } = body;

  if (!dates || !Array.isArray(dates) || dates.length === 0) {
    return NextResponse.json({ error: 'Pilih minimal 1 tanggal' }, { status: 400 });
  }

  // Get leave type
  let leaveType = null;
  if (leaveTypeId) {
    leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
    if (!leaveType)
      return NextResponse.json({ error: 'Jenis cuti tidak ditemukan' }, { status: 400 });
  }

  // Get active leave balance
  const currentYear = new Date().getFullYear();
  let balance = await prisma.leaveBalance.findFirst({
    where: { userId, year: currentYear }
  });

  if (!balance) {
    // Auto-create balance if not exists
    const globalSettings = await prisma.globalSetting.findMany();
    const quotaSetting = globalSettings.find((s) => s.key === 'leave_default_quota');
    const defaultQuota = parseInt(quotaSetting?.value || '12');

    balance = await prisma.leaveBalance.create({
      data: {
        userId,
        year: currentYear,
        totalQuota: defaultQuota,
        cutiBersamaCut: 0,
        used: 0,
        remaining: defaultQuota,
        expiresAt: new Date(currentYear + 1, 5, 30) // 30 Juni tahun depan
      }
    });
  }

  // Validate quota if deductQuota
  if (leaveType?.deductQuota && dates.length > balance.remaining) {
    return NextResponse.json(
      {
        error: `Sisa cuti tidak cukup. Sisa: ${balance.remaining} hari, diajukan: ${dates.length} hari`
      },
      { status: 400 }
    );
  }

  // Create transactions in a batch
  const results = [];
  for (const dateStr of dates) {
    const tx = await prisma.leaveTransaction.create({
      data: {
        userId,
        leaveBalanceId: balance.id,
        leaveTypeId: leaveTypeId || null,
        date: new Date(dateStr + 'T00:00:00.000Z'),
        type: 'debit',
        amount: 1,
        description: description || `Cuti ${leaveType?.name || 'Tahunan'}`
      }
    });
    results.push(tx);
  }

  // Update balance if deductQuota
  if (leaveType?.deductQuota) {
    const newUsed = balance.used + dates.length;
    await prisma.leaveBalance.update({
      where: { id: balance.id },
      data: { used: newUsed, remaining: balance.totalQuota - balance.cutiBersamaCut - newUsed }
    });
  }

  return NextResponse.json(
    {
      data: {
        message: `${dates.length} hari cuti berhasil diajukan`,
        transactions: results
      }
    },
    { status: 201 }
  );
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

  const tx = await prisma.leaveTransaction.findFirst({ where: { id, userId, deletedAt: null } });
  if (!tx) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });

  // Soft delete
  await prisma.leaveTransaction.update({ where: { id }, data: { deletedAt: new Date() } });

  // Restore balance if it was a debit that deducts quota
  if (tx.type === 'debit' && tx.leaveTypeId) {
    const leaveType = await prisma.leaveType.findUnique({ where: { id: tx.leaveTypeId } });
    if (leaveType?.deductQuota) {
      const balance = await prisma.leaveBalance.findUnique({ where: { id: tx.leaveBalanceId } });
      if (balance) {
        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { used: balance.used - 1, remaining: balance.remaining + 1 }
        });
      }
    }
  }

  return NextResponse.json({ data: { message: 'Transaksi berhasil dihapus' } });
}
