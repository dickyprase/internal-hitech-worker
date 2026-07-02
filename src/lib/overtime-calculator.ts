export interface OvertimeRule {
  id: number;
  label: string;
  labelFriday: string;
  durationHours: number;
  rate: number;
  sortOrder: number;
  isActive: boolean;
}

export interface OvertimeInput {
  gajiPokok: number;
  uangMakan: number;
  weekdaySelections: Record<string, number | null>;
  saturdayHours: number;
  sundayHours: number;
  rules: OvertimeRule[];
}

export interface DayResult {
  day: string;
  label: string;
  isWeekday: boolean;
  isFriday: boolean;
  durationHours: number;
  rate: number;
  amount: number;
  isRest: boolean;
}

export interface OvertimeCalculation {
  days: DayResult[];
  totalBeforeRounding: number;
  totalAfterRounding: number;
}

// ─── 8 Opsi Lembur Weekday ─────────────────────────────
// Opsi 1–8 sesuai standar: s/d 18:00 sampai s/d 22:00
// Jumat geser +15 menit karena istirahat 11:45–13:00 (bukan 12:00–13:00)
export const OVERTIME_OPTIONS = [
  { id: 1, label: 's/d 18:00', labelFriday: 's/d 18:15', durationHours: 1, rate: 1.5 },
  { id: 2, label: 's/d 19:00', labelFriday: 's/d 19:15', durationHours: 1.5, rate: 2.5 },
  { id: 3, label: 's/d 19:30', labelFriday: 's/d 19:45', durationHours: 2, rate: 3.5 },
  { id: 4, label: 's/d 20:00', labelFriday: 's/d 20:15', durationHours: 2.5, rate: 4.5 },
  { id: 5, label: 's/d 20:30', labelFriday: 's/d 20:45', durationHours: 3, rate: 5.5 },
  { id: 6, label: 's/d 21:00', labelFriday: 's/d 21:15', durationHours: 3.5, rate: 6.5 },
  { id: 7, label: 's/d 21:30', labelFriday: 's/d 21:45', durationHours: 4, rate: 7.5 },
  { id: 8, label: 's/d 22:00', labelFriday: 's/d 22:15', durationHours: 4.5, rate: 8.5 }
];

const WEEKDAY_NAMES = ['Kamis', 'Jumat', 'Senin', 'Selasa', 'Rabu'];
const WEEKEND_NAMES = ['Sabtu', 'Minggu'];

/**
 * Hitung estimasi pendapatan harian.
 *
 * Weekday (Senin–Kamis): Total = (Upah/Jam × Rate) + Uang Makan
 * Jumat:                 Total = (Upah/Jam × Rate) + Uang Makan  (rate sama, label geser +15 mnt)
 * Weekend/Hari Libur:    Total = ((Upah/Jam × 2) × Jam Fisik) + Uang Makan
 */
export function calculateOvertime(input: OvertimeInput): OvertimeCalculation {
  const upahPerJam = input.gajiPokok / 173;
  const days: DayResult[] = [];

  // ── Weekday calculations ──
  for (const dayName of WEEKDAY_NAMES) {
    const ruleId = input.weekdaySelections[dayName];
    const isFriday = dayName === 'Jumat';

    if (ruleId === null || ruleId === undefined || ruleId === -1) {
      const isRest = ruleId === -1;
      days.push({
        day: dayName,
        label: isRest ? 'Tidak Masuk' : 'Tidak Lembur',
        isWeekday: true,
        isFriday,
        durationHours: 0,
        rate: 0,
        amount: isRest ? 0 : ruleId === 0 ? input.uangMakan : 0,
        isRest
      });
      continue;
    }

    const rule = input.rules.find((r) => r.id === ruleId);
    if (!rule) continue;

    const rate = Number(rule.rate);
    const duration = Number(rule.durationHours);
    // Weekday & Jumat: (Upah/Jam × Rate) + Uang Makan
    const dailyAmount = upahPerJam * rate + input.uangMakan;

    days.push({
      day: dayName,
      label: isFriday ? rule.labelFriday : rule.label,
      isWeekday: true,
      isFriday,
      durationHours: duration,
      rate,
      amount: dailyAmount,
      isRest: false
    });
  }

  // ── Weekend calculations ──
  for (const dayName of WEEKEND_NAMES) {
    const hours = dayName === 'Sabtu' ? input.saturdayHours : input.sundayHours;

    if (hours <= 0) {
      days.push({
        day: dayName,
        label: 'Tidak Lembur',
        isWeekday: false,
        isFriday: false,
        durationHours: 0,
        rate: 0,
        amount: 0,
        isRest: false
      });
      continue;
    }

    // Weekend: ((Upah/Jam × 2) × Jam Fisik) + Uang Makan
    const dailyAmount = upahPerJam * 2 * hours + input.uangMakan;

    days.push({
      day: dayName,
      label: `${hours} jam`,
      isWeekday: false,
      isFriday: false,
      durationHours: hours,
      rate: 2,
      amount: dailyAmount,
      isRest: false
    });
  }

  const totalBeforeRounding = days.reduce((sum, d) => sum + d.amount, 0);
  const totalAfterRounding = Math.round(totalBeforeRounding / 1000) * 1000;

  return { days, totalBeforeRounding, totalAfterRounding };
}

/**
 * Hitung estimasi pendapatan satu hari (untuk preview di form).
 */
export function estimateDaily(
  gajiPokok: number,
  uangMakan: number,
  isWeekend: boolean,
  isHoliday: boolean,
  durationHours: number
): number {
  if (durationHours === -1) return 0; // Tidak masuk
  const upahPerJam = gajiPokok / 173;

  if (durationHours === 0) {
    // Tidak lembur, cuma uang makan (kecuali weekend/holiday)
    return isWeekend || isHoliday ? 0 : uangMakan;
  }

  if (isWeekend || isHoliday) {
    // Weekend: ((Upah/Jam × 2) × Jam Fisik) + Uang Makan
    return Math.round(upahPerJam * 2 * durationHours + uangMakan);
  }

  // Weekday: cari rate dari OVERTIME_OPTIONS
  const option = OVERTIME_OPTIONS.find((o) => o.durationHours === durationHours);
  const rate = option ? option.rate : durationHours * 1.5;
  return Math.round(upahPerJam * rate + uangMakan);
}

export function getCurrentPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();

  const start = new Date(now);
  if (dayOfWeek === 4) {
    start.setHours(0, 0, 0, 0);
  } else if (dayOfWeek > 4) {
    start.setDate(now.getDate() - (dayOfWeek - 4));
  } else {
    start.setDate(now.getDate() - (dayOfWeek + 3));
  }

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { start, end };
}

export function roundToThousand(v: number): number {
  const r = v % 1000;
  return r < 500 ? v - r : v + (1000 - r);
}
