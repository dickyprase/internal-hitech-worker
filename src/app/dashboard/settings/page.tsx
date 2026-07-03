'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { PageHeader } from '@/components/shared/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
import { CurrencyInput } from '@/components/shared/currency-input';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { formatDate } from '@/lib/format';
import {
  IconSettings,
  IconLoader,
  IconRefresh,
  IconEdit,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconTrash,
  IconDatabase,
  IconCalendar,
  IconCategory
} from '@tabler/icons-react';

interface GlobalSetting {
  id: number;
  key: string;
  value: string;
  description: string;
}

interface OvertimeRule {
  id: number;
  label: string;
  labelFriday: string;
  durationHours: number;
  rate: number;
  sortOrder: number;
  isActive: boolean;
}

interface PlafonRule {
  id: number;
  type: string;
  label: string;
  statusPernikahan: string;
  jumlahAnakMin: number;
  jumlahAnakMax: number | null;
  multiplier: number;
  isActive: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<GlobalSetting[]>([]);
  const [overtimeRules, setOvertimeRules] = useState<OvertimeRule[]>([]);
  const [plafonRules, setPlafonRules] = useState<PlafonRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editable settings
  const [siteName, setSiteName] = useState('');
  const [uangMakan, setUangMakan] = useState(0);
  const [leaveQuota, setLeaveQuota] = useState(12);

  // Inline edit states
  const [editingRate, setEditingRate] = useState<number | null>(null);
  const [tempRate, setTempRate] = useState(0);
  const [editingMult, setEditingMult] = useState<number | null>(null);

  // Reset data states
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [resetTarget, setResetTarget] = useState('');
  const [resetDataTypes, setResetDataTypes] = useState<string[]>([]);
  const [resetting, setResetting] = useState(false);

  // Holiday states
  const [holidays, setHolidays] = useState<any[]>([]);
  const [holidayDate, setHolidayDate] = useState<Date | undefined>(undefined);
  const [holidayName, setHolidayName] = useState('');
  const [holidayType, setHolidayType] = useState<'national' | 'cuti_bersama'>('national');
  const [holidayYear, setHolidayYear] = useState(String(new Date().getFullYear()));

  // Leave type states
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [newLeaveTypeName, setNewLeaveTypeName] = useState('');
  const [newLeaveTypeDeduct, setNewLeaveTypeDeduct] = useState(true);

  // Pagination
  const filteredHolidays = holidays.filter((h: any) => h.year === Number(holidayYear));
  const { currentItems: paginatedHolidays, currentPage: holidayPage, setCurrentPage: setHolidayPage, totalPages: holidayTotalPages } = usePagination(filteredHolidays, 7);
  const { currentItems: paginatedLeaveTypes, currentPage: ltPage, setCurrentPage: setLtPage, totalPages: ltTotalPages } = usePagination(leaveTypes, 7);
  const [tempMult, setTempMult] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, overtimeRes, plafonRes, usersRes] = await Promise.all([
        fetch('/api/settings/global'),
        fetch('/api/settings/overtime-rules'),
        fetch('/api/settings/plafon-rules'),
        fetch('/api/user/list')
      ]);

      const settingsData = await settingsRes.json();
      const overtimeData = await overtimeRes.json();
      const plafonData = await plafonRes.json();

      const s = settingsData.data || [];
      setSettings(s);
      setOvertimeRules(overtimeData.data || []);
      setPlafonRules(plafonData.data || []);
      const usersData = await usersRes.json();
      setUsers(
        (usersData.data || [])
          .filter((u: any) => u.role !== 'admin')
          .map((u: any) => ({ id: u.id, name: u.name, email: u.email }))
      );

      // Fetch holidays and leave types
      const [holidaysRes, leaveTypesRes] = await Promise.all([
        fetch(`/api/settings/holidays?year=${new Date().getFullYear()}`),
        fetch('/api/settings/leave-types')
      ]);
      const holidaysData = await holidaysRes.json();
      const leaveTypesData = await leaveTypesRes.json();
      setHolidays(holidaysData.data || []);
      setLeaveTypes(leaveTypesData.data || []);

      // Extract settings values
      const siteNameSetting = s.find((x: GlobalSetting) => x.key === 'site_name');
      const uangMakanSetting = s.find((x: GlobalSetting) => x.key === 'uang_makan');
      const leaveQuotaSetting = s.find((x: GlobalSetting) => x.key === 'leave_default_quota');

      setSiteName(siteNameSetting?.value || '');
      setUangMakan(parseInt(uangMakanSetting?.value || '0') || 0);
      setLeaveQuota(parseInt(leaveQuotaSetting?.value || '12') || 12);
    } catch (err) {
      setError('Gagal memuat pengaturan');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/settings/global', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [
            { key: 'site_name', value: siteName },
            { key: 'uang_makan', value: String(uangMakan) },
            { key: 'leave_default_quota', value: String(leaveQuota) }
          ]
        })
      });

      if (!res.ok) throw new Error('Gagal menyimpan');
      setSuccess('Pengaturan berhasil disimpan');
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRate = async (ruleId: number) => {
    try {
      const res = await fetch(`/api/settings/overtime-rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: tempRate })
      });

      if (!res.ok) throw new Error('Gagal menyimpan');

      setOvertimeRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, rate: tempRate } : r)));
      setEditingRate(null);
      setSuccess('Rate berhasil diperbarui');
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan rate');
    }
  };

  const handleSaveMultiplier = async (ruleId: number) => {
    try {
      const res = await fetch(`/api/settings/plafon-rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ multiplier: tempMult })
      });

      if (!res.ok) throw new Error('Gagal menyimpan');

      setPlafonRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, multiplier: tempMult } : r))
      );
      setEditingMult(null);
      setSuccess('Multiplier berhasil diperbarui');
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan multiplier');
    }
  };

  const handleResetSubmit = async () => {
    if (!resetTarget || resetDataTypes.length === 0) return;
    setResetting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUser: resetTarget, dataToReset: resetDataTypes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal reset data');
      setSuccess(data.message || 'Data berhasil di-reset');
      setResetTarget('');
      setResetDataTypes([]);
    } catch (err: any) {
      setError(err.message || 'Gagal reset data');
    } finally {
      setResetting(false);
    }
  };

  // ─── Holiday handlers ────────────────────────────────
  const handleAddHoliday = async () => {
    if (!holidayDate || !holidayName) return;
    const y = holidayDate.getFullYear();
    const m = String(holidayDate.getMonth() + 1).padStart(2, '0');
    const d = String(holidayDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    try {
      const res = await fetch('/api/settings/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, name: holidayName, type: holidayType })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setHolidayDate(undefined);
      setHolidayName('');
      setSuccess('Hari libur berhasil ditambahkan');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Gagal menambahkan');
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    try {
      await fetch(`/api/settings/holidays?id=${id}`, { method: 'DELETE' });
      setSuccess('Hari libur berhasil dihapus');
      await loadData();
    } catch {
      setError('Gagal menghapus');
    }
  };

  // ─── Leave type handlers ─────────────────────────────
  const handleAddLeaveType = async () => {
    if (!newLeaveTypeName) return;
    try {
      const res = await fetch('/api/settings/leave-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLeaveTypeName, deductQuota: newLeaveTypeDeduct })
      });
      if (!res.ok) throw new Error('Gagal menambahkan');
      setNewLeaveTypeName('');
      setNewLeaveTypeDeduct(true);
      setSuccess('Jenis cuti berhasil ditambahkan');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Gagal menambahkan');
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <IconLoader className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    );
  }

  const mcRules = plafonRules.filter((r) => r.type === 'mc');
  const riRules = plafonRules.filter((r) => r.type === 'ri');

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Pengaturan'
        subtitle='Kelola pengaturan sistem'
        actions={
          <Button variant='outline' size='sm' onClick={loadData}>
            <IconRefresh className='h-4 w-4 mr-2' />
            Refresh
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

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <IconSettings className='h-5 w-5' />
            Pengaturan Umum
          </CardTitle>
          <CardDescription>Konfigurasi dasar sistem</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-3'>
            <div className='space-y-2'>
              <Label htmlFor='siteName'>Nama Situs</Label>
              <Input id='siteName' value={siteName} onChange={(e) => setSiteName(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>Uang Makan Default</Label>
              <CurrencyInput value={uangMakan} onChange={setUangMakan} />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='leaveQuota'>Kuota Cuti Default</Label>
              <Input
                id='leaveQuota'
                type='number'
                min={0}
                value={leaveQuota}
                onChange={(e) => setLeaveQuota(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? <IconLoader className='h-4 w-4 mr-2 animate-spin' /> : null}
            Simpan Pengaturan
          </Button>
        </CardContent>
      </Card>

      {/* Overtime Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Aturan Lembur</CardTitle>
          <CardDescription>Klik pada kolom rate untuk mengedit</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Label Jumat</TableHead>
                  <TableHead>Durasi (jam)</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overtimeRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.label}</TableCell>
                    <TableCell>{rule.labelFriday}</TableCell>
                    <TableCell>{rule.durationHours}</TableCell>
                    <TableCell>
                      {editingRate === rule.id ? (
                        <div className='flex items-center gap-1'>
                          <Input
                            type='number'
                            value={tempRate}
                            onChange={(e) => setTempRate(parseFloat(e.target.value) || 0)}
                            className='w-20 h-8'
                            step='0.1'
                          />
                          <Button size='sm' variant='ghost' onClick={() => handleSaveRate(rule.id)}>
                            <IconCheck className='h-4 w-4 text-green-600' />
                          </Button>
                          <Button size='sm' variant='ghost' onClick={() => setEditingRate(null)}>
                            <IconX className='h-4 w-4 text-red-600' />
                          </Button>
                        </div>
                      ) : (
                        <button
                          className='flex items-center gap-1 hover:text-primary cursor-pointer'
                          onClick={() => {
                            setEditingRate(rule.id);
                            setTempRate(rule.rate);
                          }}
                        >
                          {rule.rate}x
                          <IconEdit className='h-3 w-3' />
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                        {rule.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Plafon Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Aturan Plafon</CardTitle>
          <CardDescription>Klik pada kolom multiplier untuk mengedit</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue='mc'>
            <TabsList>
              <TabsTrigger value='mc'>Medical Checkup</TabsTrigger>
              <TabsTrigger value='ri'>Rawat Inap</TabsTrigger>
            </TabsList>
            <TabsContent value='mc' className='mt-4'>
              <PlafonTable
                rules={mcRules}
                editingId={editingMult}
                tempValue={tempMult}
                onStartEdit={(id, val) => {
                  setEditingMult(id);
                  setTempMult(val);
                }}
                onCancelEdit={() => setEditingMult(null)}
                onSave={handleSaveMultiplier}
                onChangeTemp={setTempMult}
              />
            </TabsContent>
            <TabsContent value='ri' className='mt-4'>
              <PlafonTable
                rules={riRules}
                editingId={editingMult}
                tempValue={tempMult}
                onStartEdit={(id, val) => {
                  setEditingMult(id);
                  setTempMult(val);
                }}
                onCancelEdit={() => setEditingMult(null)}
                onSave={handleSaveMultiplier}
                onChangeTemp={setTempMult}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ─── MASTER HARI LIBUR ─── */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <IconCalendar className='h-5 w-5' />
            Master Hari Libur
          </CardTitle>
          <CardDescription>Kelola hari libur nasional dan cuti bersama</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-6 md:grid-cols-2'>
            <div className='space-y-4'>
              <h4 className='font-semibold text-sm'>Tambah Hari Libur</h4>
              <div className='space-y-3'>
                <div className='space-y-1'>
                  <Label>Tanggal</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant='outline'
                        className='w-full justify-start text-left font-normal'
                      >
                        <IconCalendar className='mr-2 h-4 w-4' />
                        {holidayDate ? formatDate(holidayDate.toISOString()) : 'Pilih tanggal'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-auto p-0'>
                      <Calendar mode='single' selected={holidayDate} onSelect={setHolidayDate} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className='space-y-1'>
                  <Label>Keterangan</Label>
                  <Input
                    value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    placeholder='Contoh: Hari Kemerdekaan'
                  />
                </div>
                <div className='space-y-1'>
                  <Label>Tipe</Label>
                  <Select value={holidayType} onValueChange={(v: any) => setHolidayType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='national'>Libur Nasional</SelectItem>
                      <SelectItem value='cuti_bersama'>Cuti Bersama</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAddHoliday}
                  disabled={!holidayDate || !holidayName}
                  className='w-full'
                >
                  Tambah
                </Button>
              </div>
            </div>
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <h4 className='font-semibold text-sm'>Daftar Hari Libur</h4>
                <Select value={holidayYear} onValueChange={setHolidayYear}>
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
              <div className='border rounded-lg overflow-hidden'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead className='w-10'></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHolidays.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className='text-center text-muted-foreground py-4'>
                          Belum ada data
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedHolidays.map((h: any) => (
                          <TableRow key={h.id}>
                            <TableCell className='whitespace-nowrap'>
                              {formatDate(h.date)}
                            </TableCell>
                            <TableCell>{h.name}</TableCell>
                            <TableCell>
                              <Badge
                                variant='outline'
                                className={
                                  h.type === 'national'
                                    ? 'border-red-300 text-red-600'
                                    : 'border-green-300 text-green-600'
                                }
                              >
                                {h.type === 'national' ? 'Nasional' : 'Cuti Bersama'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-7 w-7'
                                onClick={() => handleDeleteHoliday(h.id)}
                              >
                                <IconTrash className='h-4 w-4 text-destructive' />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <PaginationBar currentPage={holidayPage} totalPages={holidayTotalPages} onPageChange={setHolidayPage} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── MASTER JENIS CUTI ─── */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <IconCategory className='h-5 w-5' />
            Master Jenis Cuti
          </CardTitle>
          <CardDescription>Kelola jenis cuti yang tersedia</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-6 md:grid-cols-2 items-start'>
            <div className='space-y-4'>
              <h4 className='font-semibold text-sm'>Tambah Jenis Cuti</h4>
              <div className='space-y-3'>
                <div className='space-y-1'>
                  <Label>Nama Jenis Cuti</Label>
                  <Input
                    value={newLeaveTypeName}
                    onChange={(e) => setNewLeaveTypeName(e.target.value)}
                    placeholder='Contoh: Cuti Nikah'
                  />
                </div>
                <div className='flex items-center gap-2'>
                  <Checkbox
                    checked={newLeaveTypeDeduct}
                    onCheckedChange={(c) => setNewLeaveTypeDeduct(c === true)}
                  />
                  <Label className='text-sm font-normal cursor-pointer'>
                    Potong Kuota Tahunan?
                  </Label>
                </div>
                <Button
                  onClick={handleAddLeaveType}
                  disabled={!newLeaveTypeName}
                  className='w-full'
                >
                  Tambah
                </Button>
              </div>
            </div>
            <div className='space-y-4'>
              <h4 className='font-semibold text-sm'>Daftar Jenis Cuti</h4>
              <div className='border rounded-lg overflow-hidden'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Potong Kuota</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveTypes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className='text-center text-muted-foreground py-4'>
                          Belum ada data
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedLeaveTypes.map((lt: any) => (
                        <TableRow key={lt.id}>
                          <TableCell className='font-medium'>{lt.name}</TableCell>
                          <TableCell>
                            <Badge variant={lt.deductQuota ? 'default' : 'secondary'}>
                              {lt.deductQuota ? 'Ya' : 'Tidak'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={lt.isActive ? 'default' : 'secondary'}>
                              {lt.isActive ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <PaginationBar currentPage={ltPage} totalPages={ltTotalPages} onPageChange={setLtPage} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── RESET DATA KARYAWAN (DANGER ZONE) ─── */}
      <Card className='border-destructive/50'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-destructive'>
            <IconAlertTriangle className='h-5 w-5' />
            Reset Data Karyawan (Danger Zone)
          </CardTitle>
          <CardDescription>
            Hapus data karyawan tertentu atau semua karyawan. Tindakan ini tidak dapat dibatalkan.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Pilih User */}
          <div className='space-y-2'>
            <Label>Pilih Karyawan</Label>
            <Select value={resetTarget} onValueChange={setResetTarget}>
              <SelectTrigger>
                <SelectValue placeholder='Pilih karyawan...' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>
                  <span className='font-semibold text-destructive'>Semua Karyawan (All Users)</span>
                </SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pilih Tipe Data */}
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <Label>Pilih Data yang Akan Direset</Label>
              <Button
                variant='ghost'
                size='sm'
                className='h-auto py-1 px-2 text-xs'
                onClick={() => {
                  if (resetDataTypes.length === 4) {
                    setResetDataTypes([]);
                  } else {
                    setResetDataTypes(['lembur', 'cuti', 'medical', 'rawat-inap']);
                  }
                }}
              >
                {resetDataTypes.length === 4 ? 'Batal Pilih Semua' : 'Pilih Semua Data'}
              </Button>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              {[
                { id: 'lembur', label: 'Data Lembur', icon: IconDatabase },
                { id: 'cuti', label: 'Data Cuti', icon: IconDatabase },
                { id: 'medical', label: 'Data Medical Checkup', icon: IconDatabase },
                { id: 'rawat-inap', label: 'Data Rawat Inap', icon: IconDatabase }
              ].map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${
                    resetDataTypes.includes(item.id)
                      ? 'border-destructive/50 bg-destructive/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => {
                    setResetDataTypes((prev) =>
                      prev.includes(item.id)
                        ? prev.filter((t) => t !== item.id)
                        : [...prev, item.id]
                    );
                  }}
                >
                  <Checkbox
                    checked={resetDataTypes.includes(item.id)}
                    onCheckedChange={(checked) => {
                      setResetDataTypes((prev) =>
                        checked ? [...prev, item.id] : prev.filter((t) => t !== item.id)
                      );
                    }}
                  />
                  <item.icon className='h-4 w-4 text-muted-foreground' />
                  <span className='text-sm'>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tombol Reset + Alert Dialog */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant='destructive'
                className='w-full'
                disabled={!resetTarget || resetDataTypes.length === 0 || resetting}
              >
                {resetting ? (
                  <>
                    <IconLoader className='h-4 w-4 mr-2 animate-spin' />
                    Mereset Data...
                  </>
                ) : (
                  <>
                    <IconTrash className='h-4 w-4 mr-2' />
                    Reset Data Terpilih
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apakah Anda yakin ingin mereset data?</AlertDialogTitle>
                <AlertDialogDescription>
                  Anda akan menghapus data{' '}
                  <span className='font-semibold text-foreground'>
                    {resetDataTypes
                      .map((t) => {
                        switch (t) {
                          case 'lembur':
                            return 'Lembur';
                          case 'cuti':
                            return 'Cuti';
                          case 'medical':
                            return 'Medical Checkup';
                          case 'rawat-inap':
                            return 'Rawat Inap';
                          default:
                            return t;
                        }
                      })
                      .join(', ')}
                  </span>{' '}
                  untuk{' '}
                  <span className='font-semibold text-foreground'>
                    {resetTarget === 'all'
                      ? 'Semua Karyawan'
                      : users.find((u) => u.id === resetTarget)?.name || 'User'}
                  </span>
                  . Tindakan ini tidak dapat dibatalkan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  onClick={handleResetSubmit}
                >
                  Ya, Hapus Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

function PlafonTable({
  rules,
  editingId,
  tempValue,
  onStartEdit,
  onCancelEdit,
  onSave,
  onChangeTemp
}: {
  rules: PlafonRule[];
  editingId: number | null;
  tempValue: number;
  onStartEdit: (id: number, val: number) => void;
  onCancelEdit: () => void;
  onSave: (id: number) => void;
  onChangeTemp: (val: number) => void;
}) {
  if (rules.length === 0) {
    return <p className='text-sm text-muted-foreground py-4'>Tidak ada aturan plafon</p>;
  }

  return (
    <div className='overflow-x-auto'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Label</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Anak Min</TableHead>
            <TableHead>Anak Max</TableHead>
            <TableHead>Multiplier</TableHead>
            <TableHead>Aktif</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell>{rule.label}</TableCell>
              <TableCell>
                <Badge variant={rule.statusPernikahan === 'married' ? 'default' : 'secondary'}>
                  {rule.statusPernikahan === 'married' ? 'Menikah' : 'Single'}
                </Badge>
              </TableCell>
              <TableCell>{rule.jumlahAnakMin}</TableCell>
              <TableCell>{rule.jumlahAnakMax ?? '∞'}</TableCell>
              <TableCell>
                {editingId === rule.id ? (
                  <div className='flex items-center gap-1'>
                    <Input
                      type='number'
                      value={tempValue}
                      onChange={(e) => onChangeTemp(parseFloat(e.target.value) || 0)}
                      className='w-20 h-8'
                      step='0.1'
                    />
                    <Button size='sm' variant='ghost' onClick={() => onSave(rule.id)}>
                      <IconCheck className='h-4 w-4 text-green-600' />
                    </Button>
                    <Button size='sm' variant='ghost' onClick={onCancelEdit}>
                      <IconX className='h-4 w-4 text-red-600' />
                    </Button>
                  </div>
                ) : (
                  <button
                    className='flex items-center gap-1 hover:text-primary cursor-pointer'
                    onClick={() => onStartEdit(rule.id, rule.multiplier)}
                  >
                    {rule.multiplier}x
                    <IconEdit className='h-3 w-3' />
                  </button>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                  {rule.isActive ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
