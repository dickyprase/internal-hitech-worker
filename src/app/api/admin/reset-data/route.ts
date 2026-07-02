import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { targetUser, dataToReset } = body;

    if (!targetUser || !dataToReset || !Array.isArray(dataToReset) || dataToReset.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Tentukan user yang akan di-reset
    let userIds: string[] = [];
    if (targetUser === 'all') {
      const users = await prisma.user.findMany({
        where: { role: { not: 'admin' } },
        select: { id: true }
      });
      userIds = users.map((u) => u.id);
    } else {
      const user = await prisma.user.findUnique({ where: { id: targetUser } });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      if (user.role === 'admin') {
        return NextResponse.json({ error: 'Cannot reset admin data' }, { status: 400 });
      }
      userIds = [targetUser];
    }

    const results: Record<string, number> = {};

    for (const dataType of dataToReset) {
      switch (dataType) {
        case 'lembur': {
          const deleted = await prisma.overtimeRecord.deleteMany({
            where: { userId: { in: userIds } }
          });
          results.lembur = deleted.count;
          break;
        }
        case 'cuti': {
          const deletedTx = await prisma.leaveTransaction.deleteMany({
            where: { userId: { in: userIds } }
          });
          // Reset balances ke default
          const leaveBalances = await prisma.leaveBalance.findMany({
            where: { userId: { in: userIds } }
          });
          for (const bal of leaveBalances) {
            await prisma.leaveBalance.update({
              where: { id: bal.id },
              data: { used: 0, remaining: bal.totalQuota - bal.cutiBersamaCut }
            });
          }
          results.cuti = deletedTx.count;
          break;
        }
        case 'medical': {
          const deletedTx = await prisma.medicalTransaction.deleteMany({
            where: { userId: { in: userIds }, medicalBalance: { type: 'mc' } }
          });
          const mcBalances = await prisma.medicalBalance.findMany({
            where: { userId: { in: userIds }, type: 'mc' }
          });
          for (const bal of mcBalances) {
            await prisma.medicalBalance.update({
              where: { id: bal.id },
              data: { used: 0, remaining: bal.plafon }
            });
          }
          results.medical = deletedTx.count;
          break;
        }
        case 'rawat-inap': {
          const deletedTx = await prisma.medicalTransaction.deleteMany({
            where: { userId: { in: userIds }, medicalBalance: { type: 'ri' } }
          });
          const riBalances = await prisma.medicalBalance.findMany({
            where: { userId: { in: userIds }, type: 'ri' }
          });
          for (const bal of riBalances) {
            await prisma.medicalBalance.update({
              where: { id: bal.id },
              data: { used: 0, remaining: bal.plafon }
            });
          }
          results['rawat-inap'] = deletedTx.count;
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Data berhasil di-reset untuk ${userIds.length} karyawan`,
      results
    });
  } catch (error) {
    console.error('Reset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
