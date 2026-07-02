import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Admin User ────────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hitech.com' },
    update: {},
    create: {
      name: 'Administrator',
      email: 'admin@hitech.com',
      password: adminPassword,
      role: 'admin',
      nik: 'ADM001',
      statusKaryawan: 'tetap',
      statusPernikahan: 'married',
      jumlahAnak: 2,
      gajiPokok: 10000000,
      isActive: true
    }
  });
  console.log(`  ✓ Admin user: ${admin.email}`);

  // ─── Test User ─────────────────────────────────────────
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@hitech.com' },
    update: {},
    create: {
      name: 'Budi Karyawan',
      email: 'user@hitech.com',
      password: userPassword,
      role: 'user',
      nik: 'EMP001',
      statusKaryawan: 'tetap',
      statusPernikahan: 'single',
      jumlahAnak: 0,
      gajiPokok: 5000000,
      isActive: true
    }
  });
  console.log(`  ✓ Test user: ${user.email}`);

  // ─── Global Settings ───────────────────────────────────
  const settings = [
    {
      key: 'site_name',
      value: 'Hitech Worker System',
      label: 'Nama Website',
      description: 'Nama yang tampil di sidebar dan title'
    },
    {
      key: 'uang_makan',
      value: '15000',
      label: 'Uang Makan per Hari (Rp)',
      description: 'Uang makan yang didapat per hari lembur'
    },
    {
      key: 'leave_default_quota',
      value: '12',
      label: 'Jatah Cuti Tahunan Default',
      description: 'Jumlah hari cuti per tahun'
    },
    {
      key: 'leave_grace_month',
      value: '6',
      label: 'Bulan Expire Cuti',
      description: 'Bulan kadaluwarsa cuti (1-12)'
    },
    {
      key: 'leave_grace_day',
      value: '30',
      label: 'Tanggal Expire Cuti',
      description: 'Tanggal kadaluwarsa cuti'
    }
  ];

  for (const s of settings) {
    await prisma.globalSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s
    });
  }
  console.log('  ✓ Global settings');

  // ─── Overtime Rules ────────────────────────────────────
  const overtimeRules = [
    { label: 's/d 18:00', labelFriday: 's/d 18:15', durationHours: 1, rate: 1.5, sortOrder: 1 },
    { label: 's/d 19:00', labelFriday: 's/d 19:15', durationHours: 1.5, rate: 2.5, sortOrder: 2 },
    { label: 's/d 19:30', labelFriday: 's/d 19:45', durationHours: 2, rate: 3.5, sortOrder: 3 },
    { label: 's/d 20:00', labelFriday: 's/d 20:15', durationHours: 2.5, rate: 4.5, sortOrder: 4 },
    { label: 's/d 20:30', labelFriday: 's/d 20:45', durationHours: 3, rate: 5.5, sortOrder: 5 },
    { label: 's/d 21:00', labelFriday: 's/d 21:15', durationHours: 3.5, rate: 6.5, sortOrder: 6 },
    { label: 's/d 21:30', labelFriday: 's/d 21:45', durationHours: 4, rate: 7.5, sortOrder: 7 },
    { label: 's/d 22:00', labelFriday: 's/d 22:15', durationHours: 4.5, rate: 8.5, sortOrder: 8 }
  ];

  for (const rule of overtimeRules) {
    await prisma.overtimeRule.upsert({
      where: { id: rule.sortOrder },
      update: {},
      create: rule
    });
  }
  console.log('  ✓ Overtime rules');

  // ─── Plafon Rules (MC) ─────────────────────────────────
  const mcRules = [
    {
      type: 'mc' as const,
      label: 'Lajang',
      statusPernikahan: 'single' as const,
      jumlahAnakMin: 0,
      jumlahAnakMax: null,
      multiplier: 1.0
    },
    {
      type: 'mc' as const,
      label: 'Menikah · Belum ada anak',
      statusPernikahan: 'married' as const,
      jumlahAnakMin: 0,
      jumlahAnakMax: 0,
      multiplier: 1.2
    },
    {
      type: 'mc' as const,
      label: 'Menikah · 1 anak',
      statusPernikahan: 'married' as const,
      jumlahAnakMin: 1,
      jumlahAnakMax: 1,
      multiplier: 1.3
    },
    {
      type: 'mc' as const,
      label: 'Menikah · 2 anak',
      statusPernikahan: 'married' as const,
      jumlahAnakMin: 2,
      jumlahAnakMax: 2,
      multiplier: 1.4
    },
    {
      type: 'mc' as const,
      label: 'Menikah · 3+ anak',
      statusPernikahan: 'married' as const,
      jumlahAnakMin: 3,
      jumlahAnakMax: null,
      multiplier: 1.5
    }
  ];

  const riRules = [
    {
      type: 'ri' as const,
      label: 'Lajang',
      statusPernikahan: 'single' as const,
      jumlahAnakMin: 0,
      jumlahAnakMax: null,
      multiplier: 4.0
    },
    {
      type: 'ri' as const,
      label: 'Menikah · Belum ada anak',
      statusPernikahan: 'married' as const,
      jumlahAnakMin: 0,
      jumlahAnakMax: 0,
      multiplier: 6.0
    },
    {
      type: 'ri' as const,
      label: 'Menikah · 1-3 anak',
      statusPernikahan: 'married' as const,
      jumlahAnakMin: 1,
      jumlahAnakMax: 3,
      multiplier: 8.0
    }
  ];

  let plafonIdx = 1;
  for (const rule of [...mcRules, ...riRules]) {
    await prisma.plafonRule.upsert({
      where: { id: plafonIdx },
      update: {},
      create: rule
    });
    plafonIdx++;
  }
  console.log('  ✓ Plafon rules (MC + RI)');

  // ─── Create Leave Balances for users ───────────────────
  const currentYear = new Date().getFullYear();
  const expiresAt = new Date(currentYear + 1, 5, 30); // 30 Juni tahun depan

  for (const u of [admin, user]) {
    await prisma.leaveBalance.upsert({
      where: { userId_year: { userId: u.id, year: currentYear } },
      update: {},
      create: {
        userId: u.id,
        year: currentYear,
        totalQuota: 12,
        cutiBersamaCut: 0,
        used: 0,
        remaining: 12,
        expiresAt
      }
    });
  }
  console.log('  ✓ Leave balances');

  // ─── Create Medical Balances for users ─────────────────
  for (const u of [admin, user]) {
    // Determine multiplier based on user status
    const mcMultiplier =
      u.statusPernikahan === 'single'
        ? 1.0
        : u.jumlahAnak === 0
          ? 1.2
          : u.jumlahAnak === 1
            ? 1.3
            : u.jumlahAnak === 2
              ? 1.4
              : 1.5;

    const riMultiplier = u.statusPernikahan === 'single' ? 4.0 : u.jumlahAnak === 0 ? 6.0 : 8.0;

    const mcPlafon = Number(u.gajiPokok) * mcMultiplier;
    const riPlafon = Number(u.gajiPokok) * riMultiplier;

    await prisma.medicalBalance.upsert({
      where: { userId_type_year: { userId: u.id, type: 'mc', year: currentYear } },
      update: {},
      create: {
        userId: u.id,
        type: 'mc',
        year: currentYear,
        plafon: mcPlafon,
        used: 0,
        remaining: mcPlafon
      }
    });

    await prisma.medicalBalance.upsert({
      where: { userId_type_year: { userId: u.id, type: 'ri', year: currentYear } },
      update: {},
      create: {
        userId: u.id,
        type: 'ri',
        year: currentYear,
        plafon: riPlafon,
        used: 0,
        remaining: riPlafon
      }
    });
  }
  console.log('  ✓ Medical balances (MC + RI)');

  console.log('\n✅ Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
