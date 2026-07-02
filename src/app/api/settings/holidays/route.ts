import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET — list holidays by year
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

  const holidays = await prisma.holiday.findMany({
    where: { year, deletedAt: null },
    orderBy: { date: 'asc' }
  });
  return NextResponse.json({ data: holidays });
}

// POST — create holiday (admin only)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { date, name, type } = body;

  if (!date || !name || !type) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
  }

  const holidayDate = new Date(date + 'T00:00:00.000Z');
  const year = holidayDate.getFullYear();

  try {
    const holiday = await prisma.holiday.create({
      data: { date: holidayDate, name, type, year }
    });
    return NextResponse.json({ data: holiday }, { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Tanggal tersebut sudah terdaftar' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal menyimpan' }, { status: 500 });
  }
}

// DELETE — soft delete holiday (admin only)
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get('id') || '0');

  if (!id) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

  await prisma.holiday.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  return NextResponse.json({ data: { message: 'Hari libur berhasil dihapus' } });
}
