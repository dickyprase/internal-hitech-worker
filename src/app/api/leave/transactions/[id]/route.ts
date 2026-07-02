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

  const transaction = await prisma.leaveTransaction.findFirst({
    where: { id, userId, deletedAt: null, type: 'debit' }
  });

  if (!transaction) {
    return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.leaveTransaction.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    const balance = await tx.leaveBalance.findUnique({
      where: { id: transaction.leaveBalanceId }
    });

    if (balance) {
      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: {
          used: balance.used - transaction.amount,
          remaining: balance.remaining + transaction.amount
        }
      });
    }
  });

  return NextResponse.json({ data: { message: 'Data berhasil dihapus' } });
}
