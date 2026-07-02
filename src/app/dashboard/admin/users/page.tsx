'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
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
import { PageHeader } from '@/components/shared/page-header';
import { CurrencyInput } from '@/components/shared/currency-input';
import { EmptyState } from '@/components/shared/empty-state';
import { formatRupiah, formatDate } from '@/lib/format';
import {
  IconUsers,
  IconLoader,
  IconRefresh,
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconUserOff
} from '@tabler/icons-react';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  nik: string | null;
  statusKaryawan: string;
  statusPernikahan: string;
  jumlahAnak: number;
  gajiPokok: number;
  isActive: boolean;
  createdAt: string;
}

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'user',
  statusKaryawan: 'tetap',
  statusPernikahan: 'single',
  jumlahAnak: 0,
  gajiPokok: 0
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.data || []);
    } catch {
      setError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const openAddDialog = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (user: UserRow) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      statusKaryawan: user.statusKaryawan,
      statusPernikahan: user.statusPernikahan,
      jumlahAnak: user.jumlahAnak,
      gajiPokok: Number(user.gajiPokok)
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email) {
      setError('Nama dan email wajib diisi');
      return;
    }
    if (!editingUser && !form.password) {
      setError('Password wajib diisi untuk karyawan baru');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const method = editingUser ? 'PUT' : 'POST';
      const body = editingUser
        ? { id: editingUser.id, ...form, ...(form.password ? {} : { password: undefined }) }
        : form;

      const res = await fetch('/api/admin/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan');

      setSuccess(editingUser ? 'Karyawan berhasil diperbarui' : 'Karyawan berhasil ditambahkan');
      setDialogOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: UserRow) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, isActive: !user.isActive })
      });
      if (!res.ok) throw new Error('Gagal mengubah status');
      setSuccess(user.isActive ? 'Karyawan dinonaktifkan' : 'Karyawan diaktifkan');
      await loadData();
    } catch {
      setError('Gagal mengubah status');
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
        title='Manajemen Karyawan'
        subtitle='Kelola data karyawan dan hak akses'
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

      <Card>
        <CardHeader>
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <IconUsers className='h-5 w-5' />
              Daftar Karyawan
              <Badge variant='secondary'>{filteredUsers.length}</Badge>
            </CardTitle>
            <div className='flex items-center gap-2'>
              <div className='relative'>
                <IconSearch className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Cari nama karyawan...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className='pl-9 w-[200px]'
                />
              </div>
              <Button onClick={openAddDialog}>
                <IconPlus className='h-4 w-4 mr-1' /> Tambah
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <EmptyState
              icon={<IconUsers className='h-12 w-12' />}
              title='Tidak ada karyawan'
              description={
                search ? 'Tidak ditemukan karyawan dengan nama tersebut' : 'Belum ada data karyawan'
              }
            />
          ) : (
            <div className='w-full overflow-x-auto rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='whitespace-nowrap'>Karyawan</TableHead>
                    <TableHead className='whitespace-nowrap'>Role</TableHead>
                    <TableHead className='whitespace-nowrap'>Status</TableHead>
                    <TableHead className='whitespace-nowrap'>Pernikahan</TableHead>
                    <TableHead className='text-right whitespace-nowrap'>Gaji Pokok</TableHead>
                    <TableHead className='whitespace-nowrap'>Akses</TableHead>
                    <TableHead className='text-right whitespace-nowrap'>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className={!user.isActive ? 'opacity-50' : ''}>
                      <TableCell>
                        <div>
                          <p className='font-medium'>{user.name}</p>
                          <p className='text-xs text-muted-foreground'>{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role === 'admin' ? 'Admin' : 'Karyawan'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant='outline'
                          className={
                            user.statusKaryawan === 'tetap'
                              ? 'border-green-300 text-green-700'
                              : 'border-amber-300 text-amber-700'
                          }
                        >
                          {user.statusKaryawan === 'tetap' ? 'Tetap' : 'Kontrak'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className='text-sm'>
                          {user.statusPernikahan === 'single'
                            ? 'Single'
                            : `Menikah · ${user.jumlahAnak} anak`}
                        </span>
                      </TableCell>
                      <TableCell className='text-right font-medium whitespace-nowrap'>
                        {formatRupiah(Number(user.gajiPokok))}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={user.isActive}
                          onCheckedChange={() => handleToggleActive(user)}
                        />
                      </TableCell>
                      <TableCell className='text-right whitespace-nowrap'>
                        <div className='flex items-center justify-end gap-1'>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8'
                            onClick={() => openEditDialog(user)}
                          >
                            <IconEdit className='h-4 w-4' />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant='ghost' size='icon' className='h-8 w-8'>
                                {user.isActive ? (
                                  <IconTrash className='h-4 w-4 text-destructive' />
                                ) : (
                                  <IconUserOff className='h-4 w-4 text-muted-foreground' />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {user.isActive ? 'Nonaktifkan' : 'Aktifkan'} Karyawan?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {user.isActive
                                    ? `${user.name} akan dinonaktifkan dan tidak bisa mengakses sistem. Data lembur, cuti, dan medical tetap tersimpan.`
                                    : `${user.name} akan diaktifkan kembali.`}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  className={
                                    user.isActive
                                      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                      : ''
                                  }
                                  onClick={() => handleToggleActive(user)}
                                >
                                  Ya, {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
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
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='sm:max-w-lg max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Perbarui data karyawan' : 'Isi data untuk menambahkan karyawan baru'}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label>Nama Lengkap</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder='John Doe'
                />
              </div>
              <div className='space-y-2'>
                <Label>Email</Label>
                <Input
                  type='email'
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder='john@company.com'
                />
              </div>
              <div className='space-y-2'>
                <Label>
                  Password{' '}
                  {editingUser && (
                    <span className='text-xs text-muted-foreground'>
                      (kosongkan jika tidak diubah)
                    </span>
                  )}
                </Label>
                <Input
                  type='password'
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder='••••••••'
                />
              </div>
              <div className='space-y-2'>
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='user'>Karyawan</SelectItem>
                    <SelectItem value='admin'>Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label>Status Karyawan</Label>
                <Select
                  value={form.statusKaryawan}
                  onValueChange={(v) => setForm((f) => ({ ...f, statusKaryawan: v }))}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='tetap'>Tetap</SelectItem>
                    <SelectItem value='kontrak'>Kontrak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label>Gaji Pokok</Label>
                <CurrencyInput
                  value={form.gajiPokok}
                  onChange={(v) => setForm((f) => ({ ...f, gajiPokok: v }))}
                />
              </div>
              <div className='space-y-2'>
                <Label>Status Pernikahan</Label>
                <Select
                  value={form.statusPernikahan}
                  onValueChange={(v) => {
                    setForm((f) => ({
                      ...f,
                      statusPernikahan: v,
                      jumlahAnak: v === 'single' ? 0 : f.jumlahAnak
                    }));
                  }}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='single'>Single</SelectItem>
                    <SelectItem value='married'>Menikah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.statusPernikahan === 'married' && (
                <div className='space-y-2'>
                  <Label>Jumlah Anak</Label>
                  <Input
                    type='number'
                    min={0}
                    className='w-full'
                    value={form.jumlahAnak}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, jumlahAnak: parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? <IconLoader className='h-4 w-4 mr-2 animate-spin' /> : null}
              {editingUser ? 'Simpan Perubahan' : 'Tambah Karyawan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
