import { addDays, getDay, format, isAfter, startOfMonth, isWeekend } from 'date-fns';

interface HolidayDate {
  date: string; // "2026-07-17"
  type: 'national' | 'cuti_bersama';
}

/**
 * Hitung hari kerja efektif dari startDate sampai endDate.
 * - Skip Sabtu/Minggu
 * - Skip hari libur (national + cuti_bersama)
 * - Hari ini hanya dihitung jika sudah lewat jam 08:00
 */
export function hitungHariKerjaEfektif(
  startDate: Date,
  endDate: Date,
  holidays: HolidayDate[]
): number {
  const holidaySet = new Set(holidays.map(h => h.date.split('T')[0]));
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const currentHour = today.getHours();

  let count = 0;
  let current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = getDay(current); // 0=Sun, 6=Sat
    const dateStr = format(current, 'yyyy-MM-dd');

    // Skip weekend
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      current = addDays(current, 1);
      continue;
    }

    // Skip holidays
    if (holidaySet.has(dateStr)) {
      current = addDays(current, 1);
      continue;
    }

    // Hari ini: hanya hitung jika sudah lewat jam 08:00
    if (dateStr === todayStr) {
      if (currentHour >= 8) {
        count++;
      }
    } else if (isAfter(today, current) || dateStr < todayStr) {
      // Hari yang sudah lewat (bukan hari ini)
      count++;
    }
    // Hari yang belum datang: tidak dihitung

    current = addDays(current, 1);
  }

  return count;
}

/**
 * Hitung total hari cuti user di bulan berjalan (hanya hari kerja)
 */
export function hitungTotalCutiKerja(
  cutiDates: string[], // array "YYYY-MM-DD"
  holidays: HolidayDate[]
): number {
  const holidaySet = new Set(holidays.map(h => h.date.split('T')[0]));

  let count = 0;
  for (const dateStr of cutiDates) {
    const d = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = getDay(d);

    // Skip weekend
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Skip holidays (sudah libur, tidak perlu potong cuti)
    if (holidaySet.has(dateStr)) continue;

    count++;
  }

  return count;
}

/**
 * Format rupiah helper
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}
