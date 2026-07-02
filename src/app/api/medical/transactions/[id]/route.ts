import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const userId = (session.user as any).id;

  const transaction = await prisma.medicalTransaction.findFirst({
    where: { id, userId, deletedAt: null, type: 'debit' }
  });

  if (!transaction) {
    return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.medicalTransaction.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    const balance = await tx.medicalBalance.findUnique({
      where: { id: transaction.medicalBalanceId }
    });

    if (balance) {
      await tx.medicalBalance.update({
        where: { id: balance.id },
        data: {
          used: Number(balance.used) - Number(transaction.amount),
          remaining: Number(balance.remaining) + Number(transaction.amount)
        }
      });
    }
  });

  return NextResponse.json({ data: { message: 'Data berhasil dihapus' } });
}
