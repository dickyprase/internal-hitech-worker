'use client';

import { usePagination } from '@/hooks/use-pagination';
import { PaginationBar } from '@/components/shared/pagination-bar';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { formatRupiah, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { getCurrentPeriod, OVERTIME_OPTIONS, type OvertimeRule } from '@/lib/overtime-calculator';
import {
  IconClock,
  IconCash,
  IconLoader,
  IconRefresh,
  IconPlus,
  IconFileText,
  IconCheck,
  IconClockHour4,
  IconInfoCircle,
  IconChartLine,
  IconClipboardText,
  IconFilter,
  IconX,
  IconCalendar,
  IconChevronDown
} from '@tabler/icons-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

// ─── Types ─────────────────────────────────────────────
interface OvertimePeriod {
  periodStart: string;
  periodEnd: string;
  records: any[];
  totalAmount: number;
  totalRounded: number;
  status: 'belum' | 'cair';
  dayCount: number;
}

interface ChartDataPoint {
  date: string;
  nominal: number;
  jam: number;
}

// ─── Constants ─────────────────────────────────────────
const MONTHS = [
  { value: '1', label: 'Januari' },
  { value: '2', label: 'Februari' },
  { value: '3', label: 'Maret' },
  { value: '4', label: 'April' },
  { value: '5', label: 'Mei' },
  { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' },
  { value: '8', label: 'Agustus' },
  { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' }
];

// ─── Main Page ─────────────────────────────────────────
export default function LemburPage() {
  // State
  const [rules, setRules] = useState<OvertimeRule[]>([]);
  const [gajiPokok, setGajiPokok] = useState(0);
  const [uangMakan, setUangMakan] = useState(15000);
  const [attendance, setAttendance] = useState<any>(null);
  const [periods, setPeriods] = useState<OvertimePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filter
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const [filterOpen, setFilterOpen] = useState(false);

  // Form state
  const [formDate, setFormDate] = useState<Date | undefined>(undefined);
  const [formOptionId, setFormOptionId] = useState<string>('0');
  const [formIsHoliday, setFormIsHoliday] = useState(false);
  const [weekendStartTime, setWeekendStartTime] = useState('');
  const [weekendEndTime, setWeekendEndTime] = useState('');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Detail Dialog
  const [selectedPeriod, setSelectedPeriod] = useState<OvertimePeriod | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cairDialogOpen, setCairDialogOpen] = useState(false);

  // ─── Detect day type ─────────────────────────────────
  const dayOfWeek = formDate ? formDate.getDay() : -1;
  const isFriday = dayOfWeek === 5;
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isWeekendMode = isWeekend || formIsHoliday;
  const dayName = formDate
    ? ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][dayOfWeek]
    : '';

  useEffect(() => {
    setFormOptionId('0');
    setWeekendStartTime('');
    setWeekendEndTime('');
    setFormIsHoliday(false);
  }, [formDate]);

  // ─── Data Loading ────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rulesRes, recordsRes, meRes, settingsRes] = await Promise.all([
        fetch('/api/settings/overtime-rules'),
        fetch(`/api/overtime/records?month=${filterMonth}&year=${filterYear}`),
        fetch('/api/user/me'),
        fetch('/api/settings/global'),
        fetch('/api/dashboard')
      ]);
      const rulesData = await rulesRes.json();
      const recordsData = await recordsRes.json();
      const meData = await meRes.json();
      const settingsData = await settingsRes.json();
      setRules(rulesData.data || []);
      setPeriods(recordsData.data || []);
      if (meData.data?.gajiPokok) setGajiPokok(Number(meData.data.gajiPokok));
      // Fetch uang_makan from global_settings (single source of truth)
      const settings = settingsData.data || [];
      const uangMakanSetting = settings.find((s: any) => s.key === 'uang_makan');
      if (uangMakanSetting) setUangMakan(Number(uangMakanSetting.value) || 15000);
      // Fetch attendance data
      const dashData = await (await fetch('/api/dashboard')).json();
      setAttendance(dashData.data?.attendance || null);
    } catch {
      setError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered periods by month/year
  const filteredPeriods = periods.filter((p) => {
    const d = new Date(p.periodStart);
    return d.getMonth() === Number(filterMonth) - 1 && d.getFullYear() === Number(filterYear);
  });


  // Pagination for period table
  const { currentItems: paginatedPeriods, currentPage: periodPage, setCurrentPage: setPeriodPage, totalPages: periodTotalPages } = usePagination(filteredPeriods, 10);
  // ─── Summary (reaktif berdasarkan filter) ─────────────
  const subtotalPendapatan = filteredPeriods.reduce((s, p) => s + p.totalRounded, 0);
  const totalSudahCair = filteredPeriods
    .filter((p) => p.status === 'cair')
    .reduce((s, p) => s + p.totalRounded, 0);
  const totalBelumCair = filteredPeriods
    .filter((p) => p.status === 'belum')
    .reduce((s, p) => s + p.totalRounded, 0);
  // ─── Chart Data ──────────────────────────────────────
  const chartData: ChartDataPoint[] = [];
  for (const period of periods) {
    for (const record of period.records) {
      const hrs = Number(record.durationHours);
      const amt = Number(record.roundedAmount);
      if (hrs > 0 || (record.dayType !== 'weekend' && amt > 0)) {
        chartData.push({
          date: new Date(record.date).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short'
          }),
          nominal: amt,
          jam: hrs
        });
      }
    }
  }

  // ─── Estimasi ────────────────────────────────────────
  // Helper: parse "HH:MM" to minutes from midnight
  const parseTime = (t: string): number => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  // Helper: calculate weekend duration with lunch break deduction
  const calcWeekendDuration = (): number => {
    const start = parseTime(weekendStartTime);
    const end = parseTime(weekendEndTime);
    if (start <= 0 || end <= 0 || end <= start) return 0;

    let durationMin = end - start;

    // Deduct 1 hour if range crosses 12:00–13:00 (lunch break)
    const lunchStart = 12 * 60; // 720
    const lunchEnd = 13 * 60; // 780
    if (start < lunchEnd && end > lunchStart) {
      durationMin -= 60;
    }

    return Math.max(0, durationMin / 60);
  };

  let estimasi = 0;
  let displayDuration = 0;

  if (formDate && gajiPokok > 0) {
    const upahPerJam = gajiPokok / 173;

    if (isWeekendMode) {
      const hrs = calcWeekendDuration();
      displayDuration = hrs;
      if (hrs > 0) {
        // Weekend: ((Upah/Jam × 2) × Jam Fisik) + Uang Makan
        estimasi = Math.round(upahPerJam * 2 * hrs + uangMakan);
      } else {
        // No hours entered → just uang makan (if not holiday) or 0
        estimasi = formIsHoliday ? 0 : uangMakan;
      }
    } else {
      const optId = parseInt(formOptionId);
      if (optId === 0) {
        // Tidak Lembur → uang makan saja
        estimasi = uangMakan;
        displayDuration = 0;
      } else if (optId === -1) {
        // Tidak Masuk → 0
        estimasi = 0;
        displayDuration = 0;
      } else {
        const opt = OVERTIME_OPTIONS.find((o) => o.id === optId);
        if (opt) {
          displayDuration = opt.durationHours;
          // Weekday: (Upah/Jam × Rate) + Uang Makan
          estimasi = Math.round(upahPerJam * opt.rate + uangMakan);
        }
      }
    }
  }

  // Label template terpilih untuk button
  const getSelectedLabel = (): string => {
    if (!formDate) return 'Pilih tanggal terlebih dahulu';
    if (isWeekendMode) return 'Mode Weekend / Libur';
    const optId = parseInt(formOptionId);
    if (optId === 0) return 'Tidak Lembur (Uang Makan Saja)';
    if (optId === -1) return 'Tidak Masuk';
    const opt = OVERTIME_OPTIONS.find((o) => o.id === optId);
    if (opt) {
      const label = isFriday ? opt.labelFriday : opt.label;
      return `${label} (${opt.durationHours} Jam)`;
    }
    return 'Pilih Template';
  };

  const getDisplayLabel = (opt: (typeof OVERTIME_OPTIONS)[0]) =>
    isFriday ? opt.labelFriday : opt.label;

  // ─── Submit ──────────────────────────────────────────
  const handleSave = async () => {
    if (!formDate) {
      setError('Pilih tanggal');
      return;
    }
    if (gajiPokok <= 0) {
      setError('Gaji pokok belum diatur');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      // Format tanggal pakai zona waktu LOKAL, bukan UTC
      const y = formDate.getFullYear();
      const m = String(formDate.getMonth() + 1).padStart(2, '0');
      const d = String(formDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const optId = parseInt(formOptionId);
      let dayType: 'weekday' | 'weekend' = 'weekday';
      let overtimeRuleId: number | null = null;
      let durationHours = 0;

      if (isWeekendMode) {
        dayType = 'weekend';
        durationHours = calcWeekendDuration();
      } else if (optId === -1 || optId === 0) {
        durationHours = 0;
      } else {
        const opt = OVERTIME_OPTIONS.find((o) => o.id === optId);
        if (opt) {
          overtimeRuleId = opt.id;
          durationHours = opt.durationHours;
        }
      }

      const res = await fetch('/api/overtime/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dates: [{ date: dateStr, dayType, overtimeRuleId, durationHours, isFriday }],
          gajiPokok,
          uangMakan
        })
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'Gagal menyimpan');
      }
      setSuccess('Data lembur berhasil disimpan');
      setFormDate(undefined);
      setFormOptionId('0');
      setWeekendStartTime('');
      setWeekendEndTime('');
      setFormIsHoliday(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  // ─── Mark Cair (optimistic update) ───────────────────
  const handleMarkCair = async () => {
    if (!selectedPeriod) return;
    const targetPeriod = selectedPeriod; // capture before null

    // 1. Optimistic update — update UI langsung
    setPeriods((prev) =>
      prev.map((p) =>
        p.periodStart === targetPeriod.periodStart && p.periodEnd === targetPeriod.periodEnd
          ? { ...p, status: 'cair' as const }
          : p
      )
    );
    setCairDialogOpen(false);
    setDialogOpen(false);
    setSelectedPeriod(null);
    setSuccess('Periode berhasil ditandai sudah cair');

    // 2. API call di background
    try {
      const res = await fetch('/api/overtime/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: targetPeriod.periodStart,
          periodEnd: targetPeriod.periodEnd,
          status: 'cair'
        })
      });
      if (!res.ok) throw new Error('Gagal update status');
      // 3. Refetch untuk sinkronisasi data server
      await loadData();
    } catch (err: any) {
      // Rollback jika gagal
      setPeriods((prev) =>
        prev.map((p) =>
          p.periodStart === targetPeriod.periodStart && p.periodEnd === targetPeriod.periodEnd
            ? { ...p, status: 'belum' as const }
            : p
        )
      );
      setError(err.message || 'Gagal update status');
    }
  };

  const openPeriodDialog = (period: OvertimePeriod) => {
    setSelectedPeriod(period);
    setDialogOpen(true);
  };

  // ─── Loading ─────────────────────────────────────────
  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <IconLoader className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────
  return (
    <div className='space-y-6'>
      {/* ═══════════════════════════════════════════════
          TUGAS 1 — HEADER & FILTER
          ═══════════════════════════════════════════════ */}
      <div className='flex items-start justify-between gap-4'>
        <div className=''>
          <h1 className='text-2xl font-bold tracking-tight'>Lembur</h1>
          <p className='text-muted-foreground text-sm'>Kelola data lembur dan pantau pendapatan</p>
        </div>
        <div className='flex items-center gap-2 shrink-0'>
          <Button variant='outline' size='icon' onClick={loadData} title='Refresh data'>
            <IconRefresh className='h-4 w-4' />
          </Button>
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant='outline' size='icon' title='Filter bulan & tahun'>
                <IconFilter className='h-4 w-4' />
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-72' align='end'>
              <div className='space-y-4'>
                <div className='font-medium text-sm'>Filter Periode</div>
                <div className='space-y-2'>
                  <Label className='text-xs'>Bulan</Label>
                  <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger className='w-full'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label className='text-xs'>Tahun</Label>
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger className='w-full'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027].map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  className='w-full'
                  onClick={() => setFilterOpen(false)}
                >
                  Terapkan
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className='bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm flex items-center justify-between'>
          {error}
          <Button variant='ghost' size='icon' className='h-5 w-5' onClick={() => setError('')}>
            <IconX className='h-3 w-3' />
          </Button>
        </div>
      )}
      {success && (
        <div className='bg-green-500/10 text-green-700 dark:text-green-400 px-4 py-3 rounded-md text-sm flex items-center justify-between'>
          {success}
          <Button variant='ghost' size='icon' className='h-5 w-5' onClick={() => setSuccess('')}>
            <IconX className='h-3 w-3' />
          </Button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          TUGAS 2 — CARD RINGKASAN (3 GRID SEJAJAR)
          ═══════════════════════════════════════════════ */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* Total Periode Ini */}
        <Card className='h-full'>
          <CardContent className='p-6'>
            <div className='flex items-center gap-4'>
              <div className='p-3 rounded-xl bg-primary/10 shrink-0'>
                <IconCash className='h-6 w-6 text-primary' />
              </div>
              <div className=''>
                <p className='text-sm text-muted-foreground'>Total Periode Ini</p>
                <p className='text-2xl font-bold truncate' title={formatRupiah(subtotalPendapatan)}>
                  {formatRupiah(subtotalPendapatan)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sudah Cair */}
        <Card className='h-full'>
          <CardContent className='p-6'>
            <div className='flex items-center gap-4'>
              <div className='p-3 rounded-xl bg-green-500/10 shrink-0'>
                <IconCheck className='h-6 w-6 text-green-600 dark:text-green-400' />
              </div>
              <div className=''>
                <p className='text-sm text-muted-foreground'>Sudah Cair</p>
                <p
                  className='text-2xl font-bold text-green-600 dark:text-green-400 truncate'
                  title={formatRupiah(totalSudahCair)}
                >
                  {formatRupiah(totalSudahCair)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Belum Cair */}
        <Card className='h-full'>
          <CardContent className='p-6'>
            <div className='flex items-center gap-4'>
              <div className='p-3 rounded-xl bg-yellow-500/10 shrink-0'>
                <IconClockHour4 className='h-6 w-6 text-yellow-600 dark:text-yellow-400' />
              </div>
              <div className=''>
                <p className='text-sm text-muted-foreground'>Belum Cair</p>
                <p
                  className='text-2xl font-bold text-yellow-600 dark:text-yellow-400 truncate'
                  title={formatRupiah(totalBelumCair)}
                >
                  {formatRupiah(totalBelumCair)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════
          TUGAS 3 — FORM INPUT & CHART (12 KOLOM)
          ═══════════════════════════════════════════════ */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Kolom Kiri: Form Input */}
        <div>
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <IconPlus className='h-5 w-5' />
                Tambah Data Lembur
              </CardTitle>
            </CardHeader>
            <CardContent className='p-6 pt-0 space-y-4'>
              {/* Tanggal — Shadcn DatePicker */}
              <div className='space-y-2'>
                <Label>Tanggal</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formDate && 'text-muted-foreground'
                      )}
                    >
                      <IconCalendar className='mr-2 h-4 w-4' />
                      {formDate
                        ? `${dayName}, ${formDate.getDate()} ${MONTHS[formDate.getMonth()].label} ${formDate.getFullYear()}`
                        : 'Pilih tanggal'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto p-0' align='start'>
                    <Calendar
                      mode='single'
                      selected={formDate}
                      onSelect={(date) => {
                        setFormDate(date);
                        setCalendarOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {formDate && (
                  <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                    {isFriday && (
                      <Badge variant='secondary' className='text-xs'>
                        Jumat (+15 mnt)
                      </Badge>
                    )}
                    {isWeekend && (
                      <Badge variant='secondary' className='text-xs'>
                        Weekend
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Switch Tanggal Merah (hanya weekday) */}
              {formDate && !isWeekend && (
                <div className='flex flex-row items-center justify-between rounded-lg border p-4 mt-2'>
                  <div className='space-y-0.5'>
                    <Label className='text-base font-medium'>Libur Nasional</Label>
                    <p className='text-sm text-muted-foreground'>
                      Aktifkan jika hari ini tanggal merah
                    </p>
                  </div>
                  <Switch checked={formIsHoliday} onCheckedChange={setFormIsHoliday} />
                </div>
              )}

              {/* ═══ MODE WEEKDAY ═══ */}
              {formDate && !isWeekendMode && (
                <div className='space-y-2'>
                  <Label>Template Lembur</Label>
                  <Button
                    variant='outline'
                    className='w-full justify-between'
                    onClick={() => setTemplateDialogOpen(true)}
                  >
                    <span className='truncate'>{getSelectedLabel()}</span>
                    <IconChevronDown className='h-4 w-4 shrink-0 ml-2 opacity-50' />
                  </Button>
                  <p className='text-xs text-muted-foreground'>
                    {isFriday
                      ? 'Jumat: istirahat 11:45–13:00, jam kerja geser +15 mnt'
                      : 'Weekday: istirahat 18:00–18:30 & 12:00–13:00 tidak dihitung'}
                  </p>

                  {/* Dialog pilih template */}
                  <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                    <DialogContent className='max-w-lg'>
                      <DialogHeader>
                        <DialogTitle>Pilih Template Lembur</DialogTitle>
                        <DialogDescription>
                          {isFriday
                            ? 'Label Jumat bergeser +15 menit karena istirahat 11:45–13:00'
                            : 'Pilih durasi lembur hari ini'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2'>
                        {/* Tidak Lembur */}
                        <button
                          type='button'
                          onClick={() => {
                            setFormOptionId('0');
                            setTemplateDialogOpen(false);
                          }}
                          className={cn(
                            'p-3 rounded-lg border text-left transition-all hover:border-primary/50 hover:bg-muted/50',
                            formOptionId === '0' &&
                              'border-primary bg-primary/5 ring-1 ring-primary/20'
                          )}
                        >
                          <p className='font-medium text-sm'>Tidak Lembur</p>
                          <p className='text-xs text-muted-foreground mt-0.5'>Uang Makan Saja</p>
                        </button>

                        {/* 8 Opsi Lembur */}
                        {OVERTIME_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type='button'
                            onClick={() => {
                              setFormOptionId(String(opt.id));
                              setTemplateDialogOpen(false);
                            }}
                            className={cn(
                              'p-3 rounded-lg border text-left transition-all hover:border-primary/50 hover:bg-muted/50',
                              formOptionId === String(opt.id) &&
                                'border-primary bg-primary/5 ring-1 ring-primary/20'
                            )}
                          >
                            <p className='font-medium text-sm'>{getDisplayLabel(opt)}</p>
                            <p className='text-xs text-muted-foreground mt-0.5'>
                              {opt.durationHours} Jam
                            </p>
                          </button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {/* ═══ MODE WEEKEND / LIBUR ═══ */}
              {formDate && isWeekendMode && (
                <div className='space-y-2'>
                  <Label>Jam Kerja (Weekend / Libur)</Label>
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='space-y-1'>
                      <Label className='text-xs text-muted-foreground'>Jam Masuk</Label>
                      <Input
                        type='time'
                        value={weekendStartTime}
                        onChange={(e) => setWeekendStartTime(e.target.value)}
                        placeholder='08:00'
                        className='text-base md:text-sm'
                      />
                    </div>
                    <div className='space-y-1'>
                      <Label className='text-xs text-muted-foreground'>Jam Pulang</Label>
                      <Input
                        type='time'
                        value={weekendEndTime}
                        onChange={(e) => setWeekendEndTime(e.target.value)}
                        placeholder='16:00'
                        className='text-base md:text-sm'
                      />
                    </div>
                  </div>
                  {weekendStartTime && weekendEndTime && (
                    <p className='text-xs text-muted-foreground'>
                      Durasi: {calcWeekendDuration().toFixed(1)} jam
                      {parseTime(weekendStartTime) < 13 * 60 &&
                        parseTime(weekendEndTime) > 12 * 60 &&
                        ' (termasuk potong istirahat 12:00–13:00)'}
                    </p>
                  )}
                </div>
              )}

              <Separator />

              {/* Estimasi */}
              <div className='p-4 bg-primary/5 border border-primary/10 rounded-lg space-y-1'>
                <div className='flex justify-between items-center'>
                  <span className='text-sm font-medium text-foreground'>
                    Estimasi Pendapatan Harian
                  </span>
                  <span className='text-xl font-bold text-primary'>{formatRupiah(estimasi)}</span>
                </div>
                {gajiPokok > 0 && (
                  <p className='text-xs text-muted-foreground'>
                    {displayDuration > 0
                      ? `${displayDuration} jam × ${formatRupiah(Math.round(gajiPokok / 173))}/jam`
                      : 'Uang makan saja'}
                    {' · '}
                    Uang makan: {formatRupiah(uangMakan)}
                  </p>
                )}
              </div>

              {/* Simpan */}
              <Button
                onClick={handleSave}
                disabled={saving || !formDate}
                className='w-full'
                size='lg'
              >
                {saving ? (
                  <IconLoader className='h-4 w-4 mr-2 animate-spin' />
                ) : (
                  <IconPlus className='h-4 w-4 mr-2' />
                )}
                Simpan Lembur
              </Button>

              {/* Info Rumus — didorong ke bawah dengan mt-auto */}
              <div className='mt-auto p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg'>
                <div className='flex items-start gap-2.5'>
                  <IconInfoCircle className='h-4 w-4 text-primary shrink-0 mt-0.5' />
                  <div className='space-y-1.5 text-xs text-muted-foreground leading-relaxed'>
                    <p className='font-semibold text-foreground'>Info Perhitungan Lembur</p>
                    <ul className='space-y-1 list-disc list-outside ml-3.5'>
                      <li>
                        <span className='font-medium text-foreground'>Weekday</span> (Senin–Kamis):
                        1 jam pertama (1.5×), jam ke-2 (2.5×), jam ke-3 (3.5×), dst.
                      </li>
                      <li>
                        <span className='font-medium text-foreground'>Jumat:</span> Jam kerja
                        bergeser +15 menit karena istirahat siang (11:45–13:00).
                      </li>
                      <li>
                        <span className='font-medium text-foreground'>Weekend/Libur:</span> Upah per
                        jam dikali 2, lalu dikali total jam fisik.
                      </li>
                      <li>Istirahat 18:00–18:30 tidak dihitung jam kerja.</li>
                      <li>Upah per jam = Gaji Pokok / 173.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kolom Kanan: Chart */}
        <div>
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <IconChartLine className='h-5 w-5' />
                Grafik Lembur Harian
              </CardTitle>
              <CardDescription>
                Tren lembur bulan {MONTHS[parseInt(filterMonth) - 1]?.label} {filterYear}
              </CardDescription>
            </CardHeader>
            <CardContent className='p-6 pt-0'>
              {chartData.length === 0 ? (
                <EmptyState
                  icon={<IconChartLine className='h-12 w-12' />}
                  title='Belum ada data grafik'
                  description='Data lembur akan tampil sebagai grafik setelah ada input'
                />
              ) : (
                <div className='flex flex-col gap-6 w-full mt-4 '>
                  {/* Grafik 1: Pendapatan (Line Chart) */}
                  <div className=''>
                    <h4 className='text-sm font-semibold text-muted-foreground mb-2'>
                      Tren Pendapatan (Rp)
                    </h4>
                    <ResponsiveContainer width='100%' height={200}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray='3 3' opacity={0.4} vertical={false} />
                        <XAxis
                          dataKey='date'
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          formatter={(value: number) => [formatRupiah(value), 'Nominal']}
                          labelFormatter={(label) => `Tanggal: ${label}`}
                          contentStyle={{
                            borderRadius: '8px',
                            border: '1px solid hsl(var(--border))',
                            backgroundColor: 'hsl(var(--card))'
                          }}
                        />
                        <Line
                          type='monotone'
                          dataKey='nominal'
                          stroke='#3b82f6'
                          strokeWidth={3}
                          dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Grafik 2: Durasi Jam (Bar Chart) */}
                  <div className=''>
                    <h4 className='text-sm font-semibold text-muted-foreground mb-2'>
                      Tren Durasi (Jam)
                    </h4>
                    <ResponsiveContainer width='100%' height={200}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray='3 3' opacity={0.4} vertical={false} />
                        <XAxis
                          dataKey='date'
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit='j' />
                        <Tooltip
                          formatter={(value: number) => [`${value} jam`, 'Durasi']}
                          labelFormatter={(label) => `Tanggal: ${label}`}
                          contentStyle={{
                            borderRadius: '8px',
                            border: '1px solid hsl(var(--border))',
                            backgroundColor: 'hsl(var(--card))'
                          }}
                        />
                        <Bar dataKey='jam' fill='#94a3b8' radius={[4, 4, 0, 0]} barSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          TUGAS 4 — DAFTAR PERIODE (FULL WIDTH)
          ═══════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
            <div>
              <CardTitle className='flex items-center gap-2 text-base'>
                <IconClipboardText className='h-5 w-5' />
                Daftar Periode Lembur
              </CardTitle>
              <CardDescription>Klik periode untuk melihat rincian di dialog</CardDescription>
            </div>
            <div className='flex flex-wrap items-center gap-3'>
              {/* Badge Subtotal */}
              <div className='px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-md font-semibold text-sm'>
                Subtotal: {formatRupiah(subtotalPendapatan)}
              </div>
              {/* Filter Bulan */}
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className='w-[130px]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='1'>Januari</SelectItem>
                  <SelectItem value='2'>Februari</SelectItem>
                  <SelectItem value='3'>Maret</SelectItem>
                  <SelectItem value='4'>April</SelectItem>
                  <SelectItem value='5'>Mei</SelectItem>
                  <SelectItem value='6'>Juni</SelectItem>
                  <SelectItem value='7'>Juli</SelectItem>
                  <SelectItem value='8'>Agustus</SelectItem>
                  <SelectItem value='9'>September</SelectItem>
                  <SelectItem value='10'>Oktober</SelectItem>
                  <SelectItem value='11'>November</SelectItem>
                  <SelectItem value='12'>Desember</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className='w-[100px]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2025, 2026, 2027].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Rincian Uang Makan */}
          {attendance && (
            <div className='flex flex-col gap-2 p-3 mb-4 rounded-lg border bg-slate-50 dark:bg-slate-900/50 text-sm'>
              <p className='font-semibold'>Rincian Pendapatan Bulan Ini:</p>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Hari Kerja Efektif:</span>
                <span className='font-medium'>{attendance.hariKerjaEfektif} hari</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Total Cuti:</span>
                <span className='font-medium'>-{attendance.totalCuti} hari</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Hari Hadir:</span>
                <span className='font-medium'>{attendance.hariHadirReal} hari</span>
              </div>
              <div className='border-t pt-2 flex justify-between font-semibold'>
                <span>Uang Makan ({attendance.hariHadirReal} × {formatRupiah(attendance.uangMakanPerHari)}):</span>
                <span className='text-emerald-600'>{formatRupiah(attendance.totalUangMakan)}</span>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className='p-6'>
          {filteredPeriods.length === 0 ? (
            <EmptyState
              icon={<IconFileText className='h-12 w-12' />}
              title='Belum ada data lembur'
              description='Data lembur yang disimpan akan muncul di sini'
            />
          ) : (
          <>
            <div className='w-full overflow-x-auto rounded-lg border'>
              <table className='w-full min-w-[600px] text-sm'>
                <thead>
                  <tr className='border-b-2 border-border bg-slate-50 dark:bg-slate-900'>
                    <th className='text-left py-3.5 px-4 font-semibold text-foreground whitespace-nowrap'>
                      Periode
                    </th>
                    <th className='text-left py-3.5 px-4 font-semibold text-foreground whitespace-nowrap'>
                      Hari Aktif
                    </th>
                    <th className='text-left py-3.5 px-4 font-semibold text-foreground whitespace-nowrap'>
                      Total
                    </th>
                    <th className='text-left py-3.5 px-4 font-semibold text-foreground whitespace-nowrap'>
                      Status
                    </th>
                    <th className='text-right py-3.5 px-4 font-semibold text-foreground whitespace-nowrap'>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPeriods.map((period, idx) => (
                    <tr
                      key={idx}
                      className='border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors'
                      onClick={() => openPeriodDialog(period)}
                    >
                      <td className='py-3.5 px-4 font-medium whitespace-nowrap'>
                        {formatDate(period.periodStart)} — {formatDate(period.periodEnd)}
                      </td>
                      <td className='py-3.5 px-4 text-muted-foreground whitespace-nowrap'>
                        {period.dayCount} hari
                      </td>
                      <td className='py-3.5 px-4 font-bold whitespace-nowrap'>
                        {formatRupiah(period.totalRounded)}
                      </td>
                      <td className='py-3.5 px-4 whitespace-nowrap'>
                        <Badge
                          variant={period.status === 'cair' ? 'default' : 'secondary'}
                          className={
                            period.status === 'cair'
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                          }
                        >
                          {period.status === 'cair' ? 'Sudah Cair' : 'Belum Cair'}
                        </Badge>
                      </td>
                      <td className='py-3.5 px-4 text-right whitespace-nowrap'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={(e) => {
                            e.stopPropagation();
                            openPeriodDialog(period);
                          }}
                        >
                          Detail
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationBar currentPage={periodPage} totalPages={periodTotalPages} onPageChange={setPeriodPage} />
          </>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════
          SHADCN DIALOG — Rincian Periode
          ═══════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-w-lg max-h-[85vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Rincian Periode</DialogTitle>
            <DialogDescription>
              {selectedPeriod
                ? `${formatDate(selectedPeriod.periodStart)} — ${formatDate(selectedPeriod.periodEnd)}`
                : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedPeriod && (
            <div className='space-y-4 pt-2'>
              {/* Total */}
              <div className='p-4 bg-muted rounded-lg'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-muted-foreground'>Total Periode</span>
                  <span className='text-2xl font-bold text-primary'>
                    {formatRupiah(selectedPeriod.totalRounded)}
                  </span>
                </div>
                <div className='flex items-center justify-between mt-1'>
                  <span className='text-xs text-muted-foreground'>Status</span>
                  <Badge
                    variant={selectedPeriod.status === 'cair' ? 'default' : 'secondary'}
                    className={
                      selectedPeriod.status === 'cair'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    }
                  >
                    {selectedPeriod.status === 'cair' ? 'Sudah Cair' : 'Belum Cair'}
                  </Badge>
                </div>
              </div>

              {/* Breakdown Harian */}
              <div className='space-y-2'>
                <p className='text-sm font-medium'>Breakdown Harian</p>
                {selectedPeriod.records.map((record: any, rIdx: number) => {
                  const hrs = Number(record.durationHours);
                  const isNoon = hrs === -1;
                  const isZero = hrs === 0;
                  return (
                    <div
                      key={rIdx}
                      className='flex items-center justify-between p-3 rounded-md border text-sm'
                    >
                      <div>
                        <p className='font-medium'>{formatDate(record.date)}</p>
                        <p className='text-xs text-muted-foreground'>
                          {record.dayType === 'weekend' ? 'Weekend' : 'Weekday'}
                          {isNoon ? ' · Tidak Masuk' : isZero ? ' · Uang Makan' : ` · ${hrs} jam`}
                        </p>
                      </div>
                      <div className='text-right shrink-0 ml-4'>
                        <p className='font-medium'>{formatRupiah(Number(record.roundedAmount))}</p>
                        {(record.dayType === 'weekend' || record.dayType === 'holiday') && (
                          <Badge
                            variant='outline'
                            className='mt-1 bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700'
                          >
                            Rate: {Number(record.rateSnapshot)}×
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Separator />

              {/* Tombol Cair */}
              {selectedPeriod.status === 'belum' ? (
                <Button
                  className='w-full bg-green-600 hover:bg-green-700 text-white'
                  size='lg'
                  onClick={() => setCairDialogOpen(true)}
                >
                  <IconCheck className='h-4 w-4 mr-2' />
                  Tandai Sudah Cair
                </Button>
              ) : (
                <div className='flex items-center justify-center gap-2 p-3 bg-green-500/10 rounded-lg'>
                  <IconCheck className='h-4 w-4 text-green-600' />
                  <span className='text-sm font-medium text-green-600 dark:text-green-400'>
                    Periode ini sudah ditandai cair
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog: Cair */}
      <ConfirmDialog
        open={cairDialogOpen}
        onOpenChange={setCairDialogOpen}
        title='Tandai Sudah Cair?'
        description={`Periode ${selectedPeriod ? `${formatDate(selectedPeriod.periodStart)} — ${formatDate(selectedPeriod.periodEnd)}` : ''} akan ditandai sudah cair. Total: ${selectedPeriod ? formatRupiah(selectedPeriod.totalRounded) : ''}`}
        confirmLabel='Ya, Sudah Cair'
        onConfirm={handleMarkCair}
      />
    </div>
  );
}
