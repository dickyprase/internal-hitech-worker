import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET — list all leave types
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const types = await prisma.leaveType.findMany({
    where: { isActive: true },
    orderBy: { id: 'asc' }
  });
  return NextResponse.json({ data: types });
}

// POST — create leave type (admin only)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, deductQuota } = body;

  if (!name) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 });

  const leaveType = await prisma.leaveType.create({
    data: { name, deductQuota: deductQuota ?? true }
  });
  return NextResponse.json({ data: leaveType }, { status: 201 });
}

// PUT — update leave type (admin only)
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { id, name, deductQuota, isActive } = body;

  if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

  const leaveType = await prisma.leaveType.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(deductQuota !== undefined && { deductQuota }),
      ...(isActive !== undefined && { isActive })
    }
  });
  return NextResponse.json({ data: leaveType });
}
