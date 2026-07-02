/**
 * Period utility — Kamis sampai Rabu (cut-off perusahaan)
 *
 * - Awal Periode: Hari Kamis
 * - Akhir Periode: Hari Rabu minggu depannya
 * - Tanggal Pencairan: 9 hari setelah Akhir Periode (Jumat)
 */

/** Format Date ke "YYYY-MM-DD" pakai zona waktu LOKAL, bukan UTC */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Dari tanggal apapun, cari hari Kamis terdekat SEBELUM/SAMA dengan tanggal tsb.
 */
export function getPeriodStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 4=Thu

  let diff: number;
  if (day >= 4) {
    // Thu(4), Fri(5), Sat(6) → mundur ke Kamis minggu ini
    diff = day - 4;
  } else {
    // Sun(0), Mon(1), Tue(2), Wed(3) → mundur ke Kamis minggu lalu
    diff = day + 3;
  }

  const thursday = new Date(d);
  thursday.setDate(d.getDate() - diff);
  thursday.setHours(0, 0, 0, 0);
  return thursday;
}

/**
 * Dari tanggal apapun, cari hari Rabu SETELAH/SAMA dengan tanggal tsb.
 */
export function getPeriodEnd(date: Date): Date {
  const start = getPeriodStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Kamis + 6 = Rabu
  end.setHours(0, 0, 0, 0);
  return end;
}

/**
 * Tanggal pencairan: 9 hari setelah Akhir Periode (selalu Jumat)
 */
export function getPaymentDate(periodEnd: Date): Date {
  const pay = new Date(periodEnd);
  pay.setDate(periodEnd.getDate() + 9);
  pay.setHours(0, 0, 0, 0);
  return pay;
}

/**
 * Format jadi key unik untuk grouping: "YYYY-MM-DD_YYYY-MM-DD" (lokal)
 */
export function getPeriodKey(date: Date): string {
  return `${toLocalDateStr(getPeriodStart(date))}_${toLocalDateStr(getPeriodEnd(date))}`;
}

/**
 * Format periode untuk display
 */
export function formatPeriodRange(date: Date): {
  start: string;
  end: string;
  startISO: string;
  endISO: string;
} {
  const start = getPeriodStart(date);
  const end = getPeriodEnd(date);
  return {
    start: start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    end: end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    startISO: toLocalDateStr(start),
    endISO: toLocalDateStr(end)
  };
}

export { toLocalDateStr };
