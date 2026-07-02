import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateProfileSchema } from '@/lib/validators/user';
import { NextResponse } from 'next/server';

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const userId = (session.user as any).id;
  const data = parsed.data;

  // Get current user data for history tracking
  const currentUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!currentUser) {
    return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
  }

  // Track changes
  const changes: any[] = [];
  if (data.name && data.name !== currentUser.name) {
    changes.push({ fieldChanged: 'name', oldValue: currentUser.name, newValue: data.name });
  }
  if (data.statusPernikahan && data.statusPernikahan !== currentUser.statusPernikahan) {
    changes.push({
      fieldChanged: 'status_pernikahan',
      oldValue: currentUser.statusPernikahan,
      newValue: data.statusPernikahan
    });
  }
  if (data.jumlahAnak !== undefined && data.jumlahAnak !== currentUser.jumlahAnak) {
    changes.push({
      fieldChanged: 'jumlah_anak',
      oldValue: String(currentUser.jumlahAnak),
      newValue: String(data.jumlahAnak)
    });
  }
  if (data.gajiPokok !== undefined && data.gajiPokok !== Number(currentUser.gajiPokok)) {
    changes.push({
      fieldChanged: 'gaji_pokok',
      oldValue: String(currentUser.gajiPokok),
      newValue: String(data.gajiPokok)
    });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.nik !== undefined && { nik: data.nik }),
      ...(data.statusKaryawan && { statusKaryawan: data.statusKaryawan }),
      ...(data.statusPernikahan && { statusPernikahan: data.statusPernikahan }),
      ...(data.jumlahAnak !== undefined && { jumlahAnak: data.jumlahAnak }),
      ...(data.gajiPokok !== undefined && { gajiPokok: data.gajiPokok })
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      nik: true,
      statusKaryawan: true,
      statusPernikahan: true,
      jumlahAnak: true,
      gajiPokok: true
    }
  });

  // Record status history
  for (const change of changes) {
    await prisma.userStatusHistory.create({
      data: {
        userId,
        fieldChanged: change.fieldChanged,
        oldValue: change.oldValue,
        newValue: change.newValue
      }
    });
  }

  return NextResponse.json({ data: updated });
}
