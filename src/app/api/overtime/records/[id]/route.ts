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

  const record = await prisma.overtimeRecord.findFirst({
    where: { id, userId, deletedAt: null }
  });

  if (!record) {
    return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
  }

  await prisma.overtimeRecord.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  return NextResponse.json({ data: { message: 'Data berhasil dihapus' } });
}
