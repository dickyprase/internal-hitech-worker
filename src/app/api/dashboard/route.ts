import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hitungHariKerjaEfektif, hitungTotalCutiKerja } from '@/lib/attendance';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);
  const today = new Date();

  // Get user profile
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const gajiPokok = Number(user.gajiPokok) || 0;
  const statusPernikahan = user.statusPernikahan || 'single';
  const jumlahAnak = user.jumlahAnak || 0;

  // MC Multiplier
  const getMcMultiplier = () => {
    if (statusPernikahan === 'single') return 1;
    if (jumlahAnak === 0) return 1.2;
    if (jumlahAnak === 1) return 1.3;
    if (jumlahAnak === 2) return 1.4;
    return 1.5;
  };

  // RI Multiplier
  const getRiMultiplier = () => {
    if (statusPernikahan === 'single') return 4;
    if (jumlahAnak === 0) return 6;
    return 8;
  };

  const mcPlafon = gajiPokok * getMcMultiplier();
  const riPlafon = gajiPokok * getRiMultiplier();

  // Parallel fetch
  const [
    leaveBalance,
    mcBalance,
    riBalance,
    mcTransactions,
    riTransactions,
    overtimeRecords,
    overtimeRules,
    globalSettings,
    holidays,
    leaveTransactions
  ] = await Promise.all([
    prisma.leaveBalance.findUnique({ where: { userId_year: { userId, year: currentYear } } }),
    prisma.medicalBalance.findUnique({
      where: { userId_type_year: { userId, type: 'mc', year: currentYear } }
    }),
    prisma.medicalBalance.findUnique({
      where: { userId_type_year: { userId, type: 'ri', year: currentYear } }
    }),
    prisma.medicalTransaction.findMany({
      where: { userId, deletedAt: null, medicalBalance: { type: 'mc', year: currentYear } }
    }),
    prisma.medicalTransaction.findMany({
      where: { userId, deletedAt: null, medicalBalance: { type: 'ri', year: currentYear } }
    }),
    prisma.overtimeRecord.findMany({
      where: { userId, deletedAt: null, date: { gte: monthStart, lte: monthEnd } }
    }),
    prisma.overtimeRule.findMany({ where: { isActive: true } }),
    prisma.globalSetting.findMany(),
    prisma.holiday.findMany({
      where: { year: currentYear, deletedAt: null }
    }),
    prisma.leaveTransaction.findMany({
      where: {
        userId,
        deletedAt: null,
        type: 'debit',
        date: { gte: monthStart, lte: monthEnd }
      }
    })
  ]);

  // Calculate MC used from transactions
  const mcUsed = mcTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const mcRemaining = Math.max(0, mcPlafon - mcUsed);

  // Calculate RI used from transactions
  const riUsed = riTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const riRemaining = Math.max(0, riPlafon - riUsed);

  // Calculate overtime for current month
  const overtimeTotal = overtimeRecords.reduce((sum, r) => sum + Number(r.roundedAmount), 0);
  const overtimeDays = new Set(overtimeRecords.map((r) => r.date.toISOString().split('T')[0])).size;
  const overtimeHours = overtimeRecords.reduce((sum, r) => sum + Number(r.durationHours), 0);

  // Cuti bersama count
  const cutiBersama = holidays.filter(h => h.type === 'cuti_bersama');

  const leaveQuota =
    leaveBalance?.totalQuota ??
    parseInt(globalSettings.find((s) => s.key === 'leave_default_quota')?.value || '12');
  const leaveCutiBersama = cutiBersama.length;
  const leaveRealQuota = Math.max(0, leaveQuota - leaveCutiBersama);
  const leaveUsed = leaveBalance?.used ?? 0;
  const leaveRemaining = Math.max(0, leaveRealQuota - leaveUsed);

  // ─── Attendance Calculation (Exception-Based) ─────────
  const holidayData = holidays.map(h => ({
    date: h.date.toISOString().split('T')[0],
    type: h.type as 'national' | 'cuti_bersama'
  }));

  // Hari kerja efektif dari awal bulan sampai hari ini
  const hariKerjaEfektif = hitungHariKerjaEfektif(monthStart, today, holidayData);

  // Total hari cuti user di bulan ini (hanya hari kerja)
  const cutiDates = leaveTransactions.map(tx => tx.date.toISOString().split('T')[0]);
  const totalCuti = hitungTotalCutiKerja(cutiDates, holidayData);

  // Hari hadir real
  const hariHadirReal = Math.max(0, hariKerjaEfektif - totalCuti);

  // Uang makan
  const uangMakanPerHari = parseInt(globalSettings.find((s) => s.key === 'uang_makan')?.value || '30000');
  const totalUangMakan = hariHadirReal * uangMakanPerHari;

  // Uang lembur (sudah termasuk uang makan lembur dihitung di kalkulasi lembur)
  const totalUangLembur = overtimeTotal;

  return NextResponse.json({
    data: {
      user: {
        gajiPokok,
        statusPernikahan,
        jumlahAnak,
        role: (session.user as any).role
      },
      leave: {
        totalQuota: leaveRealQuota,
        used: leaveUsed,
        remaining: leaveRemaining,
        cutiBersamaCut: leaveCutiBersama
      },
      mc: {
        plafon: mcPlafon,
        used: mcUsed,
        remaining: mcRemaining
      },
      ri: {
        plafon: riPlafon,
        used: riUsed,
        remaining: riRemaining
      },
      overtime: {
        totalAmount: overtimeTotal,
        totalDays: overtimeDays,
        totalHours: overtimeHours
      },
      attendance: {
        hariKerjaEfektif,
        totalCuti,
        hariHadirReal,
        uangMakanPerHari,
        totalUangMakan,
        totalUangLembur
      }
    }
  });
}
