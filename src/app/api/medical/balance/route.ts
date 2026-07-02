import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') as 'mc' | 'ri';

  if (!type || !['mc', 'ri'].includes(type)) {
    return NextResponse.json({ error: 'Type tidak valid' }, { status: 400 });
  }

  const currentYear = new Date().getFullYear();

  const balance = await prisma.medicalBalance.findUnique({
    where: { userId_type_year: { userId, type, year: currentYear } }
  });

  return NextResponse.json({ data: balance });
}
