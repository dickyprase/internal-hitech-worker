'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared/page-header';
import { CurrencyInput } from '@/components/shared/currency-input';
import { DatePickerField } from '@/components/shared/date-picker-field';
import { EmptyState } from '@/components/shared/empty-state';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { Progress } from '@/components/ui/progress';
import { formatRupiah, formatDate } from '@/lib/format';
import {
  IconFileText,
  IconLoader,
  IconRefresh,
  IconPlus,
  IconTrash,
  IconEdit
} from '@tabler/icons-react';

interface MedicalBalance {
  id: number;
  type: string;
  plafonAmount: number;
  used: number;
  remaining: number;
}

interface MedicalTransaction {
  id: number;
  date: string;
  type: string;
  amount: number;
  description: string;
  notes?: string;
}

export default function RawatInapPage() {
  const [balance, setBalance] = useState<MedicalBalance | null>(null);
  const [transactions, setTransactions] = useState<MedicalTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // User profile
  const [gajiPokok, setGajiPokok] = useState(0);
  const [statusPernikahan, setStatusPernikahan] = useState('single');
  const [jumlahAnak, setJumlahAnak] = useState(0);

  // Form
  const [claimDate, setClaimDate] = useState<Date | undefined>(undefined);
  const [claimAmount, setClaimAmount] = useState(0);
  const [claimDesc, setClaimDesc] = useState('');

  // Edit state
  const [editTx, setEditTx] = useState<MedicalTransaction | null>(null);
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [editAmount, setEditAmount] = useState(0);
  const [editDesc, setEditDesc] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  // Pagination
  const { currentItems: paginatedTx, currentPage: txPage, setCurrentPage: setTxPage, totalPages: txTotalPages } = usePagination(transactions, 10);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [balRes, txRes, meRes] = await Promise.all([
        fetch('/api/medical/balance?type=ri'),
        fetch('/api/medical/transactions?type=ri'),
        fetch('/api/user/me')
      ]);
      const balData = await balRes.json();
      const txData = await txRes.json();
      const meData = await meRes.json();
      setBalance(balData.data || null);
      setTransactions(txData.data || []);
      if (meData.data) {
        setGajiPokok(Number(meData.data.gajiPokok) || 0);
        setStatusPernikahan(meData.data.statusPernikahan || 'single');
        setJumlahAnak(Number(meData.data.jumlahAnak) || 0);
      }
    } catch {
      setError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // RI Multiplier: Single=4, Menikah 0 anak=6, Menikah 1+ anak=8
  const getMultiplier = () => {
    if (statusPernikahan === 'single') return 4;
    if (jumlahAnak === 0) return 6;
    return 8; // 1+ anak
  };
  const multiplier = getMultiplier();
  const calculatedPlafon = gajiPokok * multiplier;

  const totalPlafon = calculatedPlafon > 0 ? calculatedPlafon : Number(balance?.plafonAmount ?? 0);
  const terpakai = Number(balance?.used ?? 0);
  const sisaPlafon = totalPlafon - terpakai;
  const persentase = totalPlafon > 0 ? Math.min((terpakai / totalPlafon) * 100, 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimDate || !claimDesc.trim()) {
      setError('Tanggal dan deskripsi wajib diisi');
      return;
    }
    if (claimAmount <= 0) {
      setError('Jumlah klaim harus lebih dari 0');
      return;
    }
    if (sisaPlafon > 0 && claimAmount > sisaPlafon) {
      setError('Jumlah klaim melebihi sisa plafon');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    const y = claimDate.getFullYear();
    const m = String(claimDate.getMonth() + 1).padStart(2, '0');
    const d = String(claimDate.getDate()).padStart(2, '0');

    try {
      const res = await fetch('/api/medical/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ri',
          date: `${y}-${m}-${d}`,
          amount: claimAmount,
          description: claimDesc
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error);
      }
      setSuccess('Klaim rawat inap berhasil disimpan');
      setClaimDate(undefined);
      setClaimAmount(0);
      setClaimDesc('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/medical/transactions?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus');
      setSuccess('Klaim berhasil dihapus');
      await loadData();
    } catch {
      setError('Gagal menghapus');
    }
  };

  const handleEditOpen = (tx: MedicalTransaction) => {
    setEditTx(tx);
    setEditDate(new Date(tx.date));
    setEditAmount(tx.amount);
    setEditDesc(tx.description);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editTx || !editDate) return;
    setSaving(true);
    setError('');
    setSuccess('');
    const y = editDate.getFullYear();
    const m = String(editDate.getMonth() + 1).padStart(2, '0');
    const d = String(editDate.getDate()).padStart(2, '0');

    try {
      const res = await fetch('/api/medical/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editTx.id,
          date: `${y}-${m}-${d}`,
          amount: editAmount,
          description: editDesc
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error);
      }
      setSuccess('Klaim berhasil diperbarui');
      setEditOpen(false);
      setEditTx(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <IconLoader className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    );
  }

  const icon = <IconFileText className='h-4 w-4' />;

  return (
    <div className='w-full max-w-full overflow-x-hidden space-y-6'>
      <PageHeader
        title='Rawat Inap'
        subtitle='Kelola klaim rawat inap'
        actions={
          <Button variant='outline' size='icon' onClick={loadData}>
            <IconRefresh className='h-4 w-4' />
          </Button>
        }
      />

      {error && (
        <div className='bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm'>
          {error}
        </div>
      )}
      {success && (
        <div className='bg-green-500/10 text-green-700 px-4 py-3 rounded-md text-sm'>{success}</div>
      )}

      {/* Balance Cards */}
      <div className='grid gap-4 md:grid-cols-2'>
        {/* Card Plafon */}
        <Card className='bg-blue-50/30 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900'>
          <CardContent className='p-5'>
            <div className='flex items-start justify-between'>
              <div className='space-y-1'>
                <p className='text-sm text-muted-foreground'>Plafon Rawat Inap</p>
                <h2 className='text-4xl font-bold text-blue-600 dark:text-blue-400 mt-2'>
                  {formatRupiah(totalPlafon)}
                </h2>
              </div>
              <div className='h-5 w-5 text-blue-400'>{icon}</div>
            </div>
            <p className='text-sm text-muted-foreground mt-2'>
              {statusPernikahan === 'single' ? 'Lajang' : `Menikah · ${jumlahAnak} anak`} ·{' '}
              {multiplier}x gaji
            </p>
          </CardContent>
        </Card>

        {/* Card Sisa Plafon */}
        <Card
          className={
            persentase >= 90
              ? 'border-red-300 dark:border-red-700'
              : persentase >= 70
                ? 'border-amber-300 dark:border-amber-700'
                : 'border-emerald-200 dark:border-emerald-800'
          }
        >
          <CardContent className='p-5'>
            <div className='flex items-start justify-between'>
              <div className='space-y-1'>
                <p className='text-sm text-muted-foreground'>Sisa Plafon</p>
                <h2
                  className={`text-4xl font-bold mt-2 ${
                    persentase >= 90
                      ? 'text-red-600 dark:text-red-400'
                      : persentase >= 70
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {formatRupiah(sisaPlafon)}
                </h2>
              </div>
              <div
                className={`h-5 w-5 ${
                  persentase >= 90
                    ? 'text-red-400'
                    : persentase >= 70
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                }`}
              >
                {icon}
              </div>
            </div>
            <Progress
              value={persentase}
              className={`mt-3 h-2 ${
                persentase >= 90
                  ? '[&>div]:bg-red-500'
                  : persentase >= 70
                    ? '[&>div]:bg-amber-500'
                    : '[&>div]:bg-emerald-500'
              }`}
            />
            <p
              className={`text-sm mt-2 ${
                persentase >= 90
                  ? 'text-red-600 dark:text-red-400'
                  : persentase >= 70
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {persentase.toFixed(0)}% terpakai ({formatRupiah(terpakai)})
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Claim Form */}
      <Card>
        <CardHeader>
          <CardTitle>Ajukan Klaim Rawat Inap</CardTitle>
          <CardDescription>Isi form berikut untuk mengajukan klaim rawat inap</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label>Tanggal</Label>
                <DatePickerField value={claimDate} onChange={setClaimDate} />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='amount'>Jumlah (Rp)</Label>
                <CurrencyInput id='amount' value={claimAmount} onChange={setClaimAmount} />
              </div>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='desc'>Deskripsi</Label>
              <Textarea
                id='desc'
                value={claimDesc}
                onChange={(e) => setClaimDesc(e.target.value)}
                placeholder='Contoh: Rawat inap RS Siloam 3 hari'
                className='resize-none'
                rows={3}
              />
            </div>
            <div className='flex justify-end pt-2'>
              <Button type='submit' disabled={saving}>
                {saving ? (
                  <IconLoader className='h-4 w-4 mr-2 animate-spin' />
                ) : (
                  <IconPlus className='h-4 w-4 mr-2' />
                )}
                Ajukan Klaim
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Klaim Rawat Inap</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <EmptyState
              icon={<IconFileText className='h-12 w-12' />}
              title='Belum ada riwayat klaim rawat inap'
              description='Riwayat klaim rawat inap akan muncul di sini'
            />
          ) : (
            <>
            <div className='w-full overflow-x-auto rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='whitespace-nowrap'>Tanggal</TableHead>
                    <TableHead className='whitespace-nowrap'>Deskripsi</TableHead>
                    <TableHead className='text-right whitespace-nowrap'>Jumlah</TableHead>
                    <TableHead className='text-right whitespace-nowrap'>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTx.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className='whitespace-nowrap'>{formatDate(tx.date)}</TableCell>
                      <TableCell className='max-w-[250px] truncate'>{tx.description}</TableCell>
                      <TableCell className='text-right font-medium whitespace-nowrap'>
                        {formatRupiah(tx.amount)}
                      </TableCell>
                      <TableCell className='text-right whitespace-nowrap'>
                        <div className='flex items-center justify-end gap-1'>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8'
                            onClick={() => handleEditOpen(tx)}
                          >
                            <IconEdit className='h-4 w-4' />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant='ghost' size='icon' className='h-8 w-8'>
                                <IconTrash className='h-4 w-4 text-destructive' />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Klaim?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Klaim &quot;{tx.description}&quot; sebesar{' '}
                                  {formatRupiah(tx.amount)} akan dihapus. Saldo plafon akan
                                  dikembalikan.
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationBar currentPage={txPage} totalPages={txTotalPages} onPageChange={setTxPage} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Edit Klaim Rawat Inap</DialogTitle>
            <DialogDescription>Perbarui data klaim</DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>Tanggal</Label>
              <DatePickerField value={editDate} onChange={setEditDate} />
            </div>
            <div className='space-y-2'>
              <Label>Jumlah (Rp)</Label>
              <CurrencyInput value={editAmount} onChange={setEditAmount} />
            </div>
            <div className='space-y-2'>
              <Label>Deskripsi</Label>
              <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleEditSave} disabled={saving}>
              {saving ? <IconLoader className='h-4 w-4 mr-2 animate-spin' /> : null}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
