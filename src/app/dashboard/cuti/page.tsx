'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { PageHeader } from '@/components/shared/page-header';
import { Progress } from '@/components/ui/progress';

import { EmptyState } from '@/components/shared/empty-state';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationBar } from '@/components/shared/pagination-bar';

import { formatDate } from '@/lib/format';
import {
  IconCalendar,
  IconFileText,
  IconLoader,
  IconRefresh,
  IconTrash,
  IconPlus,
  IconClock,
  IconCircleCheck
} from '@tabler/icons-react';

interface LeaveBalance {
  id: number;
  totalQuota: number;
  cutiBersamaCut: number;
  used: number;
  remaining: number;
  expiresAt: string;
  realQuota?: number;
  lastYear?: number;
  lastYearRemaining?: number;
  lastYearExpiresAt?: string;
  cutiBersamaList?: { id: number; date: string; name: string }[];
  totalCutiBersama?: number;
}

interface LeaveTransaction {
  id: number;
  date: string;
  type: string;
  amount: number;
  description: string;
  leaveType?: { id: number; name: string; deductQuota: boolean } | null;
  refHoliday?: { name: string; type: string } | null;
}

interface LeaveType {
  id: number;
  name: string;
  deductQuota: boolean;
}

export default function CutiPage() {
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [transactions, setTransactions] = useState<LeaveTransaction[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state — Calendar multiple
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('');
  const [leaveDesc, setLeaveDesc] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Carry-over state
  const currentMonth = new Date().getMonth(); // 0=Jan, 5=Jun
  const [selectedTahunCuti, setSelectedTahunCuti] = useState<'current' | 'last'>('current');
  const showCarryOver = currentMonth <= 5 && (balance?.lastYearRemaining ?? 0) > 0;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [balRes, txRes, typesRes] = await Promise.all([
        fetch('/api/leave/balance'),
        fetch('/api/leave/transactions'),
        fetch('/api/settings/leave-types')
      ]);
      const balData = await balRes.json();
      const txData = await txRes.json();
      const typesData = await typesRes.json();
      setBalance(balData.data || null);
      setTransactions(txData.data || []);
      setLeaveTypes(typesData.data || []);
    } catch {
      setError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  // Derived state
  const currentLeaveType = leaveTypes.find((lt) => lt.id === Number(selectedLeaveType));
  const needsQuotaCheck = currentLeaveType?.deductQuota ?? true;

  // Active quota based on carry-over selection
  const activeQuota = selectedTahunCuti === 'last'
    ? (balance?.lastYearRemaining ?? 0)
    : (balance?.remaining ?? 0);

  const isOverQuota = needsQuotaCheck && selectedDates.length > activeQuota;
  const canSubmit =
    selectedDates.length > 0 && selectedLeaveType && leaveDesc.trim() && !isOverQuota && !saving;

  // Pagination for transactions
  const { currentItems, currentPage, setCurrentPage, totalPages } = usePagination(transactions, 10);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError('');
    setSuccess('');

    // Convert dates to YYYY-MM-DD strings (local timezone)
    const dateStrings = selectedDates.map((d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    });

    try {
      const res = await fetch('/api/leave/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dates: dateStrings,
          leaveTypeId: Number(selectedLeaveType),
          sourceYear: selectedTahunCuti === 'last' ? balance?.lastYear : new Date().getFullYear(),
          description: leaveDesc
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menyimpan');
      }
      const data = await res.json();
      setSuccess(data.data?.message || 'Cuti berhasil diajukan');
      setSelectedDates([]);
      setSelectedLeaveType('');
      setLeaveDesc('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/leave/transactions?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus');
      setSuccess('Transaksi berhasil dihapus');
      await loadData();
    } catch {
      setError('Gagal menghapus');
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <IconLoader className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    );
  }

  return (
    <div className='w-full max-w-full overflow-x-hidden space-y-6'>
      <PageHeader
        title='Cuti'
        subtitle='Kelola pengajuan cuti dan pantau sisa jatah cuti Anda'
        actions={
          <Button variant='outline' size='icon' onClick={loadData}>
            <IconRefresh className='h-4 w-4' />
          </Button>
        }
      />

      {/* Error / Success */}
      {error && (
        <div className='bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm'>
          {error}
        </div>
      )}
      {success && (
        <div className='bg-green-500/10 text-green-700 px-4 py-3 rounded-md text-sm'>{success}</div>
      )}

      {/* Stat Cards */}
      <div className='grid gap-4 md:grid-cols-3'>
        {/* Card 1: Jatah Cuti */}
        <Card>
          <CardContent className='p-5'>
            <div className='flex items-start justify-between'>
              <div className='space-y-1'>
                <p className='text-sm text-muted-foreground'>Jatah Cuti</p>
                <p className='text-3xl font-bold'>
                  {balance?.realQuota ?? balance?.totalQuota ?? 0}
                </p>
              </div>
              <IconCalendar className='h-5 w-5 text-muted-foreground' />
            </div>
            <div className='flex flex-col mt-2 gap-2'>
              <p className='text-sm text-muted-foreground'>
                Jatah dasar {balance?.totalQuota ?? 0} - {balance?.cutiBersamaCut ?? 0} cuti bersama
              </p>
              {(balance?.cutiBersamaCut ?? 0) > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className='w-fit h-7 text-xs px-3' size='sm' variant='secondary'>
                      Lihat list cuti bersama
                    </Button>
                  </DialogTrigger>
                  <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                      <DialogTitle>Daftar Cuti Bersama</DialogTitle>
                      <DialogDescription>
                        Hari libur berikut otomatis memotong jatah cuti tahunan Anda.
                      </DialogDescription>
                    </DialogHeader>
                    <div className='space-y-2 mt-4'>
                      {(balance?.cutiBersamaList ?? []).map((item) => (
                        <div
                          key={item.id}
                          className='flex justify-between items-center p-3 border rounded-lg bg-slate-50/50 dark:bg-slate-900/50'
                        >
                          <span className='font-medium text-sm'>{formatDate(item.date)}</span>
                          <span className='text-sm text-muted-foreground'>{item.name}</span>
                        </div>
                      ))}
                    </div>
                    <div className='mt-4 pt-3 border-t'>
                      <p className='text-sm font-semibold text-right'>
                        Total: {balance?.cutiBersamaCut ?? 0} hari
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Sudah Digunakan */}
        <Card>
          <CardContent className='p-5'>
            <div className='flex items-start justify-between'>
              <div className='space-y-1'>
                <p className='text-sm text-muted-foreground'>Sudah Digunakan</p>
                <p className='text-3xl font-bold text-amber-600'>{balance?.used ?? 0}</p>
              </div>
              <IconClock className='h-5 w-5 text-amber-500' />
            </div>
            <p className='text-sm text-muted-foreground mt-2'>Hari cuti terpakai</p>
          </CardContent>
        </Card>

        {/* Card 3: Sisa Cuti */}
        <Card className={(balance?.remaining ?? 0) < 3 ? 'border-red-300 dark:border-red-700' : ''}>
          <CardContent className='p-5'>
            <div className='flex items-start justify-between'>
              <div className='space-y-1'>
                <p className='text-sm text-muted-foreground'>Sisa Cuti</p>
                <p
                  className={`text-3xl font-bold ${(balance?.remaining ?? 0) < 3 ? 'text-red-600' : 'text-emerald-600'}`}
                >
                  {balance?.remaining ?? 0}
                </p>
              </div>
              <IconCircleCheck
                className={`h-5 w-5 ${(balance?.remaining ?? 0) < 3 ? 'text-red-500' : 'text-emerald-500'}`}
              />
            </div>
            <Progress
              value={balance?.realQuota ? (balance.used / balance.realQuota) * 100 : 0}
              className={`mt-3 h-2 ${(balance?.remaining ?? 0) < 3 ? '[&>div]:bg-red-500' : ''}`}
            />
            <p className='text-sm text-muted-foreground mt-2'>
              Berlaku s/d {balance?.expiresAt ? formatDate(balance.expiresAt) : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-6 lg:grid-cols-2 min-w-0'>
        {/* ─── Form Pengajuan Cuti ─── */}
        <Card className='min-w-0'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base'>
              <IconPlus className='h-5 w-5' />
              Ajukan Cuti
            </CardTitle>
            <CardDescription>Pilih tanggal, jenis cuti, dan isi keterangan</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* Jenis Cuti */}
            <div className='space-y-1.5'>
              <Label>Jenis Cuti</Label>
              <Select value={selectedLeaveType} onValueChange={setSelectedLeaveType}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Pilih jenis cuti...' />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((lt) => (
                    <SelectItem key={lt.id} value={String(lt.id)}>
                      {lt.name} {lt.deductQuota ? '(Potong Kuota)' : '(Bebas Kuota)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


            {/* Pilih Sumber Kuota (Carry-Over) */}
            {needsQuotaCheck && showCarryOver && (
              <div className='space-y-1.5'>
                <Label>Sumber Kuota Cuti</Label>
                <Select value={selectedTahunCuti} onValueChange={(v: 'current' | 'last') => setSelectedTahunCuti(v)}>
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='last'>
                      Sisa Cuti {balance?.lastYear} (Sisa: {balance?.lastYearRemaining ?? 0} hari)
                    </SelectItem>
                    <SelectItem value='current'>
                      Cuti {new Date().getFullYear()} (Sisa: {balance?.remaining ?? 0} hari)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className='text-xs text-muted-foreground'>
                  Sisa cuti tahun lalu berlaku s/d 30 Juni {new Date().getFullYear()}
                </p>
              </div>
            )}
            {/* Calendar Multiple */}
            <div className='space-y-1.5'>
              <Label>Pilih Tanggal Cuti</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant='outline' className='w-full justify-start text-left font-normal'>
                    <IconCalendar className='mr-2 h-4 w-4' />
                    {selectedDates.length === 0
                      ? 'Pilih tanggal...'
                      : `${selectedDates.length} hari dipilih`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-auto p-0' align='start'>
                  <Calendar
                    mode='multiple'
                    selected={selectedDates}
                    onSelect={(dates) => setSelectedDates(dates || [])}
                    numberOfMonths={1}
                    className='rounded-md border'
                  />
                  <div className='p-3 border-t flex items-center justify-between'>
                    <p className='text-sm text-muted-foreground'>
                      {selectedDates.length} hari dipilih
                    </p>
                    <Button size='sm' onClick={() => setCalendarOpen(false)}>
                      Selesai
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              {/* Selected dates preview */}
              {selectedDates.length > 0 && (
                <div className='flex flex-wrap gap-1.5 mt-2'>
                  {selectedDates
                    .sort((a, b) => a.getTime() - b.getTime())
                    .map((d, i) => (
                      <Badge key={i} variant='secondary' className='text-xs'>
                        {d.getDate()}/{d.getMonth() + 1}
                      </Badge>
                    ))}
                </div>
              )}
            </div>

            {/* Quota info & validation */}
            {needsQuotaCheck && selectedDates.length > 0 && (
              <div className={`px-3 py-2 rounded-md text-sm ${
                isOverQuota
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-muted text-muted-foreground'
              }`}>
                Mengajukan <strong>{selectedDates.length} hari</strong>
                {' '}(Sisa kuota: <strong>{activeQuota} hari</strong>)
                {isOverQuota && ' — Melebihi batas!'}
              </div>
            )}

            {/* Keterangan */}
            <div className='space-y-1.5'>
              <Label>Keterangan</Label>
              <Textarea
                value={leaveDesc}
                onChange={(e) => setLeaveDesc(e.target.value)}
                placeholder='Contoh: Cuti keluar kota'
                rows={3}
              />
            </div>

            <Button onClick={handleSubmit} disabled={!canSubmit} className='w-full'>
              {saving ? (
                <>
                  <IconLoader className='h-4 w-4 mr-2 animate-spin' /> Menyimpan...
                </>
              ) : (
                <>
                  <IconPlus className='h-4 w-4 mr-2' /> Ajukan Cuti ({selectedDates.length} hari)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ─── Riwayat Cuti ─── */}
        <Card className='min-w-0'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base'>
              <IconFileText className='h-5 w-5' />
              Riwayat Cuti
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <EmptyState
                icon={<IconFileText className='h-12 w-12' />}
                title='Belum ada riwayat cuti'
                description='Data cuti yang diajukan akan muncul di sini'
              />
            ) : (
              <div className='w-full overflow-x-auto rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='whitespace-nowrap'>Tanggal</TableHead>
                      <TableHead className='whitespace-nowrap'>Keterangan</TableHead>
                      <TableHead className='whitespace-nowrap'>Jenis</TableHead>
                      <TableHead className='w-10'></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className='whitespace-nowrap font-medium'>
                          {formatDate(tx.date)}
                        </TableCell>
                        <TableCell className='max-w-[200px] truncate'>{tx.description}</TableCell>
                        <TableCell>
                          {tx.leaveType ? (
                            <Badge variant={tx.leaveType.deductQuota ? 'default' : 'secondary'}>
                              {tx.leaveType.name}
                            </Badge>
                          ) : tx.refHoliday ? (
                            <Badge variant='outline' className='border-green-300 text-green-600'>
                              {tx.refHoliday.name}
                            </Badge>
                          ) : (
                            <Badge variant='secondary'>-</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {tx.type === 'debit' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant='ghost' size='icon' className='h-7 w-7'>
                                  <IconTrash className='h-4 w-4 text-destructive' />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Hapus Transaksi Cuti?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Transaksi &quot;{tx.description}&quot; akan dihapus. Saldo cuti akan dikembalikan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                    onClick={() => handleDelete(tx.id)}
                                  >
                                    Ya, Hapus
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {transactions.length > 0 && (
              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
