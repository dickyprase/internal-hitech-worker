import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      nik: true,
      statusKaryawan: true,
      statusPernikahan: true,
      jumlahAnak: true,
      gajiPokok: true,
      isActive: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ data: users });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, password, role, statusKaryawan, statusPernikahan, jumlahAnak, gajiPokok } =
    body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Nama, email, dan password wajib diisi' }, { status: 400 });
  }

  // Check duplicate email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: role || 'user',
      statusKaryawan: statusKaryawan || 'tetap',
      statusPernikahan: statusPernikahan || 'single',
      jumlahAnak: jumlahAnak || 0,
      gajiPokok: gajiPokok || 0,
      isActive: true
    },
    select: { id: true, name: true, email: true, role: true }
  });

  // Auto-create leave balance for current year
  const currentYear = new Date().getFullYear();
  const quotaSetting = await prisma.globalSetting.findUnique({
    where: { key: 'leave_default_quota' }
  });
  const defaultQuota = parseInt(quotaSetting?.value || '12');

  await prisma.leaveBalance.create({
    data: {
      userId: user.id,
      year: currentYear,
      totalQuota: defaultQuota,
      cutiBersamaCut: 0,
      used: 0,
      remaining: defaultQuota,
      expiresAt: new Date(currentYear + 1, 5, 30)
    }
  });

  // Auto-create medical balances (MC + RI)
  for (const type of ['mc', 'ri'] as const) {
    await prisma.medicalBalance.create({
      data: {
        userId: user.id,
        type,
        year: currentYear,
        plafon: 0,
        used: 0,
        remaining: 0
      }
    });
  }

  return NextResponse.json({ data: user }, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const {
    id,
    name,
    email,
    password,
    role,
    statusKaryawan,
    statusPernikahan,
    jumlahAnak,
    gajiPokok,
    isActive
  } = body;

  if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (password) updateData.password = await bcrypt.hash(password, 10);
  if (role !== undefined) updateData.role = role;
  if (statusKaryawan !== undefined) updateData.statusKaryawan = statusKaryawan;
  if (statusPernikahan !== undefined) updateData.statusPernikahan = statusPernikahan;
  if (jumlahAnak !== undefined) updateData.jumlahAnak = jumlahAnak;
  if (gajiPokok !== undefined) updateData.gajiPokok = gajiPokok;
  if (isActive !== undefined) updateData.isActive = isActive;

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, isActive: true }
  });

  return NextResponse.json({ data: user });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

  // Soft delete — set isActive to false
  await prisma.user.update({
    where: { id },
    data: { isActive: false }
  });

  return NextResponse.json({ data: { message: 'Karyawan berhasil dinonaktifkan' } });
}
