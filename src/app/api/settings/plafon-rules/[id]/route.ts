import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const rule = await prisma.plafonRule.update({
    where: { id: parseInt(id) },
    data: {
      ...(body.multiplier !== undefined && { multiplier: body.multiplier }),
      ...(body.isActive !== undefined && { isActive: body.isActive })
    }
  });

  return NextResponse.json({ data: rule });
}
