import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') as 'mc' | 'ri';
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  if (!type || !['mc', 'ri'].includes(type)) {
    return NextResponse.json({ error: 'Type tidak valid' }, { status: 400 });
  }

  const where: any = { userId, deletedAt: null };
  const balance = await prisma.medicalBalance.findUnique({
    where: { userId_type_year: { userId, type, year: new Date().getFullYear() } }
  });

  if (balance) {
    where.medicalBalanceId = balance.id;
  }

  if (month && year) {
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    where.date = { gte: startDate, lte: endDate };
  }

  const transactions = await prisma.medicalTransaction.findMany({
    where,
    orderBy: { date: 'desc' }
  });

  return NextResponse.json({ data: transactions });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await req.json();
  const { type, date, amount, description, notes } = body;

  if (!type || !date || !amount || !description) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
  }

  const currentYear = new Date().getFullYear();
  const balance = await prisma.medicalBalance.findUnique({
    where: { userId_type_year: { userId, type, year: currentYear } }
  });

  if (!balance) {
    return NextResponse.json({ error: 'Saldo medical tidak ditemukan' }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.medicalTransaction.create({
      data: {
        userId,
        medicalBalanceId: balance.id,
        date: new Date(date),
        type: 'debit',
        amount,
        description,
        notes
      }
    });

    await tx.medicalBalance.update({
      where: { id: balance.id },
      data: {
        used: Number(balance.used) + amount,
        remaining: Number(balance.remaining) - amount
      }
    });

    return transaction;
  });

  return NextResponse.json({ data: result }, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const body = await req.json();
  const { id, date, amount, description } = body;

  if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

  const tx = await prisma.medicalTransaction.findFirst({ where: { id, userId, deletedAt: null } });
  if (!tx) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });

  const oldAmount = Number(tx.amount);
  const newAmount = amount || oldAmount;
  const diff = newAmount - oldAmount;

  const result = await prisma.$transaction(async (t) => {
    const updated = await t.medicalTransaction.update({
      where: { id },
      data: {
        ...(date && { date: new Date(date) }),
        ...(amount && { amount }),
        ...(description && { description })
      }
    });

    if (diff !== 0) {
      const balance = await t.medicalBalance.findUnique({ where: { id: tx.medicalBalanceId } });
      if (balance) {
        await t.medicalBalance.update({
          where: { id: balance.id },
          data: {
            used: Number(balance.used) + diff,
            remaining: Number(balance.remaining) - diff
          }
        });
      }
    }

    return updated;
  });

  return NextResponse.json({ data: result });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

  const tx = await prisma.medicalTransaction.findFirst({ where: { id, userId, deletedAt: null } });
  if (!tx) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });

  await prisma.$transaction(async (t) => {
    await t.medicalTransaction.update({ where: { id }, data: { deletedAt: new Date() } });

    const balance = await t.medicalBalance.findUnique({ where: { id: tx.medicalBalanceId } });
    if (balance) {
      await t.medicalBalance.update({
        where: { id: balance.id },
        data: {
          used: Number(balance.used) - Number(tx.amount),
          remaining: Number(balance.remaining) + Number(tx.amount)
        }
      });
    }
  });

  return NextResponse.json({ data: { message: 'Klaim berhasil dihapus' } });
}
