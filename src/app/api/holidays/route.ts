import { NextResponse } from 'next/server';

const API_BASE = 'https://use.api.co.id/holidays/indonesia';
const API_KEY = process.env.HOLIDAY_API_KEY || '';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year') || new Date().getFullYear().toString();

  if (!API_KEY) {
    return NextResponse.json({ error: 'HOLIDAY_API_KEY not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(`${API_BASE}/?year=${year}&size=100`, {
      headers: { 'x-api-co-id': API_KEY },
      next: { revalidate: 86400 } // cache 24 jam
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: res.status });
    }

    const json = await res.json();

    // Parse ke format yang mudah dipakai frontend
    const holidays = (json.data || []).map((item: any) => ({
      id: item.id,
      date: item.date, // "2026-01-01"
      name: item.name,
      type: item.is_holiday ? 'national' : item.is_joint_holiday ? 'joint' : 'observance',
      isHoliday: item.is_holiday,
      isJointHoliday: item.is_joint_holiday,
      dayOfWeek: item.day_of_week
    }));

    return NextResponse.json({ data: holidays });
  } catch (err) {
    return NextResponse.json({ error: 'Network error' }, { status: 500 });
  }
}
