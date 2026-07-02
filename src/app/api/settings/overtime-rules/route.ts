import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rules = await prisma.overtimeRule.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  return NextResponse.json({ data: rules });
}
