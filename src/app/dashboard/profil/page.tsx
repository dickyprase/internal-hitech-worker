'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { CurrencyInput } from '@/components/shared/currency-input';
import { StatCard } from '@/components/shared/stat-card';
import { formatRupiah } from '@/lib/format';
import {
  IconUser,
  IconLock,
  IconSettings,
  IconLoader,
  IconRefresh,
  IconCash
} from '@tabler/icons-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  nik: string | null;
  statusKaryawan: string;
  statusPernikahan: string;
  jumlahAnak: number;
  gajiPokok: number;
}

export default function ProfilPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Identity form
  const [name, setName] = useState('');
  const [nik, setNik] = useState('');

  // Password form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // Job settings form
  const [gajiPokok, setGajiPokok] = useState(0);
  const [statusKaryawan, setStatusKaryawan] = useState('');
  const [statusPernikahan, setStatusPernikahan] = useState('');
  const [jumlahAnak, setJumlahAnak] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/me');
      const data = await res.json();
      if (data.data) {
        setProfile(data.data);
        setName(data.data.name || '');
        setNik(data.data.nik || '');
        setGajiPokok(Number(data.data.gajiPokok) || 0);
        setStatusKaryawan(data.data.statusKaryawan || 'tetap');
        setStatusPernikahan(data.data.statusPernikahan || 'single');
        setJumlahAnak(data.data.jumlahAnak || 0);
      }
    } catch (err) {
      setError('Gagal memuat profil');
    } finally {
      setLoading(false);
    }
  };

  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nik })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menyimpan');
      }

      setSuccess('Profil berhasil diperbarui');
      await loadProfile();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan profil');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setError('Konfirmasi password tidak cocok');
      return;
    }
    if (newPw.length < 8) {
      setError('Password baru minimal 8 karakter');
      return;
    }

    setSavingPassword(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPw,
          newPassword: newPw,
          confirmPassword: confirmPw
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal mengubah password');
      }

      setSuccess('Password berhasil diubah');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err: any) {
      setError(err.message || 'Gagal mengubah password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingJob(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile?.name,
          gajiPokok,
          statusKaryawan,
          statusPernikahan,
          jumlahAnak
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menyimpan');
      }

      setSuccess('Pengaturan pekerjaan berhasil diperbarui');
      await loadProfile();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSavingJob(false);
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
    <div className='space-y-6'>
      <PageHeader
        title='Profil'
        subtitle='Kelola informasi akun Anda'
        actions={
          <Button variant='outline' size='sm' onClick={loadProfile}>
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

      {/* Profile Summary */}
      <div className='grid gap-4 md:grid-cols-3'>
        <StatCard
          title='Nama'
          value={profile?.name || '-'}
          icon={<IconUser className='h-4 w-4' />}
        />
        <StatCard
          title='Role'
          value={profile?.role || '-'}
          icon={<IconSettings className='h-4 w-4' />}
        />
        <StatCard
          title='Gaji Pokok'
          value={profile?.gajiPokok || 0}
          formatAsCurrency
          icon={<IconCash className='h-4 w-4' />}
        />
      </div>

      {/* Identity Form */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <IconUser className='h-5 w-5' />
            Identitas
          </CardTitle>
          <CardDescription>Kelola informasi identitas Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleIdentitySubmit} className='space-y-4'>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input id='email' value={profile?.email || ''} disabled />
                <p className='text-xs text-muted-foreground'>Email tidak dapat diubah</p>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='role'>Role</Label>
                <Input id='role' value={profile?.role || ''} disabled />
                <p className='text-xs text-muted-foreground'>Role ditentukan oleh admin</p>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='name'>Nama</Label>
                <Input id='name' value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='nik'>NIK</Label>
                <Input
                  id='nik'
                  value={nik}
                  onChange={(e) => setNik(e.target.value)}
                  placeholder='Nomor Induk Kependudukan'
                />
              </div>
            </div>
            <Button type='submit' disabled={saving}>
              {saving ? <IconLoader className='h-4 w-4 mr-2 animate-spin' /> : null}
              Simpan Identitas
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Form */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <IconLock className='h-5 w-5' />
            Ubah Password
          </CardTitle>
          <CardDescription>Perbarui password akun Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className='space-y-4'>
            <div className='grid gap-4 md:grid-cols-3'>
              <div className='space-y-2'>
                <Label htmlFor='currentPw'>Password Saat Ini</Label>
                <Input
                  id='currentPw'
                  type='password'
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='newPw'>Password Baru</Label>
                <Input
                  id='newPw'
                  type='password'
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='confirmPw'>Konfirmasi Password</Label>
                <Input
                  id='confirmPw'
                  type='password'
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                />
              </div>
            </div>
            <Button type='submit' disabled={savingPassword}>
              {savingPassword ? <IconLoader className='h-4 w-4 mr-2 animate-spin' /> : null}
              Ubah Password
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Job Settings Form */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <IconSettings className='h-5 w-5' />
            Pengaturan Pekerjaan
          </CardTitle>
          <CardDescription>Kelola pengaturan terkait pekerjaan dan benefit</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJobSubmit} className='space-y-4'>
            <div className='p-5 rounded-lg border bg-slate-50 dark:bg-slate-900/50 space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6 items-start'>
                <div className='space-y-2'>
                  <Label className='flex items-center gap-2'>
                    <span className='text-muted-foreground'>💰</span> Gaji Pokok
                  </Label>
                  <CurrencyInput value={gajiPokok} onChange={setGajiPokok} />
                </div>
                <div className='space-y-2'>
                  <Label className='flex items-center gap-2'>
                    <span className='text-muted-foreground'>📋</span> Status Karyawan
                  </Label>
                  <Select value={statusKaryawan} onValueChange={setStatusKaryawan}>
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
                  <Label className='flex items-center gap-2'>
                    <span className='text-muted-foreground'>💍</span> Status Pernikahan
                  </Label>
                  <Select
                    value={statusPernikahan}
                    onValueChange={(value) => {
                      setStatusPernikahan(value);
                      if (value === 'single') setJumlahAnak(0);
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
                {statusPernikahan === 'married' && (
                  <div className='space-y-2'>
                    <Label className='flex items-center gap-2' htmlFor='anak'>
                      <span className='text-muted-foreground'>👶</span> Jumlah Anak
                    </Label>
                    <Input
                      id='anak'
                      type='number'
                      min={0}
                      className='w-full'
                      value={jumlahAnak}
                      onChange={(e) => setJumlahAnak(parseInt(e.target.value) || 0)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Delta Preview */}
            {profile &&
              (statusPernikahan !== profile.statusPernikahan ||
                jumlahAnak !== profile.jumlahAnak ||
                gajiPokok !== Number(profile.gajiPokok)) && (
                <div className='p-4 bg-muted rounded-lg'>
                  <h4 className='text-sm font-medium mb-2'>Perubahan yang akan diterapkan:</h4>
                  <div className='grid gap-2 md:grid-cols-2 text-sm'>
                    {gajiPokok !== Number(profile.gajiPokok) && (
                      <div>
                        <span className='text-muted-foreground'>Gaji Pokok:</span>{' '}
                        <span
                          className={
                            gajiPokok > Number(profile.gajiPokok)
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {formatRupiah(Number(profile.gajiPokok))} → {formatRupiah(gajiPokok)}
                        </span>
                      </div>
                    )}
                    {statusPernikahan !== profile.statusPernikahan && (
                      <div>
                        <span className='text-muted-foreground'>Status Pernikahan:</span>{' '}
                        <span>
                          {profile.statusPernikahan} → {statusPernikahan}
                        </span>
                      </div>
                    )}
                    {jumlahAnak !== profile.jumlahAnak && (
                      <div>
                        <span className='text-muted-foreground'>Jumlah Anak:</span>{' '}
                        <span>
                          {profile.jumlahAnak} → {jumlahAnak}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className='text-xs text-muted-foreground mt-2'>
                    Perubahan ini akan mempengaruhi plafon Medical Checkup dan Rawat Inap Anda.
                  </p>
                </div>
              )}

            <Button type='submit' disabled={savingJob}>
              {savingJob ? <IconLoader className='h-4 w-4 mr-2 animate-spin' /> : null}
              Simpan Pengaturan
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
