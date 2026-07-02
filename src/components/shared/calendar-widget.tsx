'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { IconCalendar, IconLoader, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  getDay
} from 'date-fns';
import { id as localeID } from 'date-fns/locale';

interface Holiday {
  id: number;
  date: string;
  name: string;
  type: 'national' | 'cuti_bersama';
  year: number;
}

function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ─── Hook ──────────────────────────────────────────────
function useHolidays(currentMonth: Date) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/settings/holidays?year=${currentMonth.getFullYear()}`);
        const data = await res.json();
        if (!cancelled) setHolidays(data.data || []);
      } catch {
        if (!cancelled) setHolidays([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentMonth.getFullYear()]);

  const getHoliday = (date: Date): Holiday | undefined => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    return holidays.find((h) => h.date.startsWith(dateStr));
  };

  return { holidays, loading, getHoliday };
}

// ─── Calendar Card ─────────────────────────────────────
export function CalendarCard() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { holidays, loading, getHoliday } = useHolidays(currentMonth);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const dayHeaders = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const monthName = format(currentMonth, 'MMMM yyyy', { locale: localeID });

  const prevMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const goToday = () => setCurrentMonth(new Date());

  const handleDayClick = (date: Date) => {
    const holiday = getHoliday(date);
    setSelectedDate(date);
    setSelectedHoliday(holiday || null);
    if (holiday) setDialogOpen(true);
  };

  const today = new Date();

  if (loading) {
    return (
      <Card>
        <CardContent className='flex items-center justify-center py-16'>
          <IconLoader className='h-8 w-8 animate-spin text-muted-foreground' />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className='w-full'>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <IconCalendar className='h-5 w-5' />
              Kalender Kerja
            </CardTitle>
            <div className='flex items-center gap-2'>
              <Button variant='outline' size='sm' onClick={goToday} className='text-xs h-7'>
                Hari Ini
              </Button>
              <Button variant='ghost' size='icon' className='h-7 w-7' onClick={prevMonth}>
                <IconChevronLeft className='h-4 w-4' />
              </Button>
              <span className='text-sm font-semibold min-w-[140px] text-center capitalize'>
                {monthName}
              </span>
              <Button variant='ghost' size='icon' className='h-7 w-7' onClick={nextMonth}>
                <IconChevronRight className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className='p-0'>
          {/* Legend */}
          <div className='flex items-center gap-4 text-xs px-6 pb-3'>
            <div className='flex items-center gap-1.5'>
              <span className='w-2.5 h-2.5 rounded-sm bg-red-500' />
              <span className='text-muted-foreground'>Libur Nasional</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <span className='w-2.5 h-2.5 rounded-sm bg-emerald-500' />
              <span className='text-muted-foreground'>Cuti Bersama</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <span className='w-2.5 h-2.5 rounded-sm bg-blue-500' />
              <span className='text-muted-foreground'>Hari Ini</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className='border-t'>
            {/* Day Headers */}
            <div className='grid grid-cols-7 w-full border-b'>
              {dayHeaders.map((name, i) => (
                <div
                  key={name}
                  className={`text-left font-semibold text-xs p-2 sm:p-3 border-r last:border-r-0 ${
                    i === 0 ? 'text-red-500' : 'text-muted-foreground'
                  }`}
                >
                  {name}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className='grid grid-cols-7 w-full'>
                {week.map((date, dayIdx) => {
                  const holiday = getHoliday(date);
                  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                  const isTodayDate = date.toDateString() === today.toDateString();
                  const isSun = getDay(date) === 0;
                  const isNational = holiday?.type === 'national';
                  const isCuti = holiday?.type === 'cuti_bersama';

                  // Cell background
                  let cellBg = '';
                  if (isNational) cellBg = 'bg-red-50 dark:bg-red-950/30';
                  else if (isCuti) cellBg = 'bg-emerald-50 dark:bg-emerald-950/30';
                  else if (isTodayDate) cellBg = 'bg-blue-50/50 dark:bg-blue-950/20';

                  // Border left accent
                  let borderLeft = '';
                  if (isNational) borderLeft = 'border-l-4 border-l-red-500';
                  else if (isCuti) borderLeft = 'border-l-4 border-l-emerald-500';

                  return (
                    <div
                      key={dayIdx}
                      onClick={() => handleDayClick(date)}
                      className={`min-h-[60px] sm:min-h-[90px] border-r border-b last:border-r-0 p-1 sm:p-1.5 flex flex-col cursor-pointer transition-colors hover:bg-muted/30 ${cellBg} ${borderLeft} ${
                        !isCurrentMonth ? 'opacity-40' : ''
                      }`}
                    >
                      {/* Date Number */}
                      <span
                        className={`text-xs sm:text-sm font-medium leading-none ${
                          isSun ? 'text-red-500' : isTodayDate ? 'text-blue-600 font-bold' : ''
                        }`}
                      >
                        {format(date, 'd')}
                        {isTodayDate && (
                          <span className='ml-1 inline-block w-1.5 h-1.5 rounded-full bg-blue-500 align-middle' />
                        )}
                      </span>

                      {/* MOBILE: dots only */}
                      <div className='flex md:hidden mt-auto justify-center gap-1'>
                        {isNational && <div className='w-2 h-2 rounded-full bg-red-500' />}
                        {isCuti && <div className='w-2 h-2 rounded-full bg-emerald-500' />}
                      </div>

                      {/* DESKTOP: full text block */}
                      <div className='hidden md:flex w-full mt-1 flex-col gap-0.5'>
                        {isNational && isCurrentMonth && (
                          <div className='w-full p-1 rounded-r-sm text-left line-clamp-2 text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400'>
                            {holiday!.name}
                          </div>
                        )}
                        {isCuti && isCurrentMonth && (
                          <div className='w-full p-1 rounded-r-sm text-left line-clamp-2 text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400'>
                            {holiday!.name}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Upcoming holidays */}
          {(() => {
            const upcoming = holidays
              .filter((h) => parseLocalDate(h.date) >= new Date())
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 5);
            if (upcoming.length === 0) return null;
            return (
              <div className='px-6 py-4 border-t'>
                <p className='text-xs font-semibold text-muted-foreground mb-2'>Libur Mendatang</p>
                <div className='flex flex-wrap gap-2'>
                  {upcoming.map((h) => (
                    <div
                      key={h.id}
                      className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md border cursor-pointer hover:opacity-80 ${
                        h.type === 'national'
                          ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300'
                      }`}
                      onClick={() => {
                        setSelectedHoliday(h);
                        setSelectedDate(parseLocalDate(h.date));
                        setDialogOpen(true);
                      }}
                    >
                      <span className='font-semibold'>
                        {format(parseLocalDate(h.date), 'd MMM', { locale: localeID })}
                      </span>
                      <span className='opacity-70'>·</span>
                      <span>{h.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Holiday Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>Detail Hari Libur</DialogTitle>
            <DialogDescription>
              {selectedDate && format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: localeID })}
            </DialogDescription>
          </DialogHeader>
          {selectedHoliday ? (
            <div className='space-y-3'>
              <div
                className={`p-3 rounded-lg border-l-4 ${
                  selectedHoliday.type === 'national'
                    ? 'border-l-red-500 bg-red-50 dark:bg-red-950/30'
                    : 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                }`}
              >
                <p
                  className={`text-base font-semibold ${
                    selectedHoliday.type === 'national'
                      ? 'text-red-700 dark:text-red-400'
                      : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {selectedHoliday.name}
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-sm text-muted-foreground'>Tipe:</span>
                <Badge
                  variant='outline'
                  className={
                    selectedHoliday.type === 'national'
                      ? 'border-red-300 text-red-600 dark:border-red-700 dark:text-red-400'
                      : 'border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400'
                  }
                >
                  {selectedHoliday.type === 'national' ? 'Libur Nasional' : 'Cuti Bersama'}
                </Badge>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-sm text-muted-foreground'>Tanggal:</span>
                <span className='text-sm font-medium'>
                  {selectedDate && format(selectedDate, 'dd MMMM yyyy', { locale: localeID })}
                </span>
              </div>
            </div>
          ) : (
            <div className='py-4 text-center text-sm text-muted-foreground'>
              Tidak ada hari libur di tanggal ini
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
