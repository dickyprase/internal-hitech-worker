'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/shared/stat-card';
import { PageHeader } from '@/components/shared/page-header';
import { CalendarCard } from '@/components/shared/calendar-widget';
import { formatRupiah, formatDate } from '@/lib/format';
import Link from 'next/link';
import {
  IconClock,
  IconCalendar,
  IconCash,
  IconFileText,
  IconUsers,
  IconPlus,
  IconLoader,
  IconClipboardHeart,
  IconStethoscope,
  IconCalendarDue,
  IconReceipt2,
  IconBuildingHospital,
  IconTrendingUp,
  IconSettings,
  IconArrowRight,
  IconAlertCircle,
  IconCheck,
  IconX
} from '@tabler/icons-react';

// --- Types ---
interface LeaveBalance {
  totalQuota: number;
  cutiBersamaCut: number;
  used: number;
  remaining: number;
}

interface MedicalBalance {
  plafon: number;
  used: number;
  remaining: number;
}

interface OvertimeSummary {
  totalAmount: number;
  totalDays: number;
  totalHours?: number;
  month: number;
  year: number;
}

interface Holiday {
  id: string;
  date: string;
  name: string;
  type: string;
}

interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: string;
  nik: string;
  statusKaryawan: string;
  isActive: boolean;
  createdAt: string;
}

interface AttendanceData {
  hariKerjaEfektif: number;
  totalCuti: number;
  hariHadirReal: number;
  uangMakanPerHari: number;
  totalUangMakan: number;
  totalUangLembur: number;
}

interface DashboardData {
  leave: LeaveBalance | null;
  mc: MedicalBalance | null;
  ri: MedicalBalance | null;
  overtime: OvertimeSummary | null;
  attendance: AttendanceData | null;
  holidays: Holiday[];
  recentLeaves: any[];
  recentMedical: any[];
  users?: UserListItem[];
}

// --- Skeleton Loader ---
function DashboardSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='space-y-2'>
          <Skeleton className='h-8 w-64' />
          <Skeleton className='h-4 w-40' />
        </div>
      </div>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-4 w-4 rounded-full' />
            </CardHeader>
            <CardContent>
              <Skeleton className='h-8 w-32' />
              <Skeleton className='mt-2 h-3 w-20' />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// --- Upcoming Holidays Card ---
function UpcomingHolidaysCard({ holidays }: { holidays: Holiday[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = holidays.filter((h) => new Date(h.date) >= today).slice(0, 5);

  const typeColor: Record<string, string> = {
    nasional: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    cuti_bersama: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    keagamaan: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
  };

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle className='text-base flex items-center gap-2'>
          <IconCalendarDue className='h-5 w-5' />
          Hari Libur Mendatang
        </CardTitle>
        <Badge variant='outline'>{upcoming.length} hari</Badge>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <p className='text-sm text-muted-foreground'>Tidak ada hari libur mendatang</p>
        ) : (
          <div className='space-y-3'>
            {upcoming.map((holiday) => (
              <div key={holiday.id} className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium'>{holiday.name}</p>
                  <p className='text-xs text-muted-foreground'>{formatDate(holiday.date)}</p>
                </div>
                <Badge
                  className={typeColor[holiday.type] || 'bg-gray-100 text-gray-800'}
                  variant='outline'
                >
                  {holiday.type === 'nasional'
                    ? 'Nasional'
                    : holiday.type === 'cuti_bersama'
                      ? 'Cuti Bersama'
                      : holiday.type}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Recent Activity Card ---
function RecentActivityCard({
  title,
  icon,
  items,
  emptyMessage
}: {
  title: string;
  icon: React.ReactNode;
  items: { date: string; description: string; amount?: number | string; badge?: string }[];
  emptyMessage: string;
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle className='text-base flex items-center gap-2'>
          {icon}
          {title}
        </CardTitle>
        <Badge variant='outline'>{items.length} entri</Badge>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className='text-sm text-muted-foreground'>{emptyMessage}</p>
        ) : (
          <div className='space-y-3'>
            {items.map((item, idx) => (
              <div
                key={idx}
                className='flex items-center justify-between border-b pb-2 last:border-0 last:pb-0'
              >
                <div className='min-w-0 flex-1'>
                  <p className='text-sm font-medium truncate'>{item.description}</p>
                  <p className='text-xs text-muted-foreground'>{formatDate(item.date)}</p>
                </div>
                {item.amount !== undefined && (
                  <span className='text-sm font-medium ml-2 whitespace-nowrap'>
                    {formatRupiah(Number(item.amount))}
                  </span>
                )}
                {item.badge && (
                  <Badge variant='secondary' className='ml-2'>
                    {item.badge}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Admin Summary Cards ---
function AdminStatsCards({ users }: { users: UserListItem[] }) {
  const activeUsers = users.filter((u) => u.isActive);
  const admins = users.filter((u) => u.role === 'admin');
  const employees = users.filter((u) => u.role === 'user');
  const tetap = users.filter((u) => u.statusKaryawan === 'tetap');
  const kontrak = users.filter((u) => u.statusKaryawan === 'kontrak');
  const probation = users.filter((u) => u.statusKaryawan === 'probation');

  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
      <Card className='bg-blue-50/50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900'>
        <CardContent className='p-5'>
          <div className='flex items-start justify-between'>
            <div className='space-y-1'>
              <p className='text-sm text-muted-foreground'>Total Karyawan</p>
              <p className='text-3xl font-bold text-blue-600'>{users.length}</p>
            </div>
            <IconUsers className='h-5 w-5 text-blue-400' />
          </div>
          <p className='text-sm text-muted-foreground mt-2'>{activeUsers.length} aktif</p>
        </CardContent>
      </Card>
      <Card className='bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900'>
        <CardContent className='p-5'>
          <div className='flex items-start justify-between'>
            <div className='space-y-1'>
              <p className='text-sm text-muted-foreground'>Karyawan Tetap</p>
              <p className='text-3xl font-bold text-emerald-600'>{tetap.length}</p>
            </div>
            <IconCheck className='h-5 w-5 text-emerald-400' />
          </div>
          <p className='text-sm text-muted-foreground mt-2'>{kontrak.length} kontrak</p>
        </CardContent>
      </Card>
      <Card className='bg-indigo-50/50 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900'>
        <CardContent className='p-5'>
          <div className='flex items-start justify-between'>
            <div className='space-y-1'>
              <p className='text-sm text-muted-foreground'>Administrator</p>
              <p className='text-3xl font-bold text-indigo-600'>{admins.length}</p>
            </div>
            <IconSettings className='h-5 w-5 text-indigo-400' />
          </div>
          <p className='text-sm text-muted-foreground mt-2'>{employees.length} karyawan biasa</p>
        </CardContent>
      </Card>
      <Card className='bg-rose-50/50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900'>
        <CardContent className='p-5'>
          <div className='flex items-start justify-between'>
            <div className='space-y-1'>
              <p className='text-sm text-muted-foreground'>Non-Aktif</p>
              <p className='text-3xl font-bold text-rose-600'>
                {users.length - activeUsers.length}
              </p>
            </div>
            <IconX className='h-5 w-5 text-rose-400' />
          </div>
          <p className='text-sm text-muted-foreground mt-2'>Akun dinonaktifkan</p>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Main Dashboard Page ---
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      fetchDashboardData();
    }
  }, [status]);

  async function fetchDashboardData() {
    try {
      setError(null);

      // Single API call for all calculated data
      const [dashRes, holidaysRes, leaveTxRes, mcTxRes] = await Promise.all([
        fetch('/api/dashboard').then((r) => r.json()),
        fetch('/api/leave/holidays').then((r) => r.json()),
        fetch('/api/leave/transactions').then((r) => r.json()),
        fetch('/api/medical/transactions?type=mc').then((r) => r.json())
      ]);

      const dash = dashRes.data || {};

      const baseData: DashboardData = {
        leave: dash.leave || null,
        mc: dash.mc || null,
        ri: dash.ri || null,
        overtime: dash.overtime || null,
        attendance: dash.attendance || null,
        holidays: holidaysRes.data || [],
        recentLeaves: (leaveTxRes.data || []).slice(0, 5),
        recentMedical: (mcTxRes.data || []).slice(0, 5)
      };

      // Admin-only: fetch user list
      if (role === 'admin') {
        try {
          const usersRes = await fetch('/api/user/list');
          const usersData = await usersRes.json();
          baseData.users = usersData.data || [];
        } catch {
          baseData.users = [];
        }
      }

      setData(baseData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Gagal memuat data dashboard. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  // Auth loading
  if (status === 'loading' || loading) {
    return (
      <div className='space-y-6'>
        <DashboardSkeleton />
      </div>
    );
  }

  if (!session) return null;

  // Error state
  if (error) {
    return (
      <div className='space-y-6'>
        <PageHeader title='Dashboard' subtitle='Terjadi kesalahan' />
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center gap-3 text-destructive'>
              <IconAlertCircle className='h-5 w-5' />
              <p>{error}</p>
            </div>
            <Button onClick={fetchDashboardData} className='mt-4' variant='outline'>
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentMonth = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <div className='space-y-6'>
      <PageHeader
        title={`Selamat datang, ${session.user?.name}`}
        subtitle={role === 'admin' ? 'Panel Administrator' : `Dashboard Karyawan · ${currentMonth}`}
      />

      {/* ===== USER DASHBOARD ===== */}
      {role !== 'admin' && (
        <div className='space-y-6'>
          {/* Stat Cards */}
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <StatCard
              title='Sisa Cuti'
              value={data?.leave?.remaining ?? 0}
              subtitle={`${data?.leave?.remaining ?? 0} hari tersisa dari ${data?.leave?.totalQuota ?? 0}`}
              icon={<IconCalendar className='h-4 w-4' />}
              progress={
                data?.leave && data.leave.totalQuota > 0
                  ? {
                      current: data.leave.totalQuota - data.leave.remaining,
                      total: data.leave.totalQuota,
                      label: `${data.leave.remaining} hari tersisa`
                    }
                  : undefined
              }
            />
            <StatCard
              title='Saldo Medical (MC)'
              value={formatRupiah(Number(data?.mc?.remaining ?? 0))}
              subtitle={`Tersisa dari ${formatRupiah(Number(data?.mc?.plafon ?? 0))}`}
              icon={<IconStethoscope className='h-4 w-4' />}
              progress={
                data?.mc && Number(data.mc.plafon) > 0
                  ? {
                      current: Number(data.mc.plafon) - Number(data.mc.remaining),
                      total: Number(data.mc.plafon),
                      label: `Tersisa ${formatRupiah(Number(data.mc.remaining))}`
                    }
                  : undefined
              }
            />
            <StatCard
              title='Saldo Rawat Inap'
              value={formatRupiah(Number(data?.ri?.remaining ?? 0))}
              subtitle={`Tersisa dari ${formatRupiah(Number(data?.ri?.plafon ?? 0))}`}
              icon={<IconBuildingHospital className='h-4 w-4' />}
              progress={
                data?.ri && Number(data.ri.plafon) > 0
                  ? {
                      current: Number(data.ri.plafon) - Number(data.ri.remaining),
                      total: Number(data.ri.plafon),
                      label: `Tersisa ${formatRupiah(Number(data.ri.remaining))}`
                    }
                  : undefined
              }
            />
            <Card className="border-l-4 border-l-indigo-400">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Estimasi Pendapatan</p>
                    <p className="text-3xl font-bold text-indigo-600">
                      {formatRupiah((data?.attendance?.totalUangMakan ?? 0) + (data?.overtime?.totalAmount ?? 0))}
                    </p>
                  </div>
                  <IconClock className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="flex flex-col space-y-1 text-sm mt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uang Makan ({data?.attendance?.hariHadirReal ?? 0} hari kerja):</span>
                    <span className="font-medium">{formatRupiah(data?.attendance?.totalUangMakan ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uang Lembur ({data?.overtime?.totalHours ?? 0} jam):</span>
                    <span className="font-medium">{formatRupiah(data?.overtime?.totalAmount ?? 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className='grid gap-4 md:grid-cols-3'>
            <Button asChild variant='outline' className='h-auto py-4'>
              <Link href='/dashboard/cuti'>
                <IconPlus className='mr-2 h-4 w-4' />
                Catat Cuti
              </Link>
            </Button>
            <Button asChild variant='outline' className='h-auto py-4'>
              <Link href='/dashboard/medical'>
                <IconPlus className='mr-2 h-4 w-4' />
                Input Klaim Medical
              </Link>
            </Button>
            <Button asChild variant='outline' className='h-auto py-4'>
              <Link href='/dashboard/lembur'>
                <IconPlus className='mr-2 h-4 w-4' />
                Input Lembur
              </Link>
            </Button>
          </div>

          {/* Recent Activity Cards */}
          <div className='grid gap-4 md:grid-cols-2'>
            <RecentActivityCard
              title='Riwayat Cuti Terakhir'
              icon={<IconCalendar className='h-5 w-5' />}
              items={(data?.recentLeaves || []).map((t: any) => ({
                date: t.date,
                description: t.description,
                amount: undefined,
                badge: `${t.amount} hari`
              }))}
              emptyMessage='Belum ada catatan cuti'
            />
            <RecentActivityCard
              title='Klaim Medical Terakhir'
              icon={<IconClipboardHeart className='h-5 w-5' />}
              items={(data?.recentMedical || []).map((t: any) => ({
                date: t.date,
                description: t.description,
                amount: Number(t.amount)
              }))}
              emptyMessage='Belum ada klaim medical'
            />
          </div>

          {/* Calendar Full Width */}
          <CalendarCard />
        </div>
      )}

      {/* ===== ADMIN DASHBOARD ===== */}
      {role === 'admin' && (
        <div className='space-y-6'>
          {/* Admin Stat Cards */}
          {data?.users && <AdminStatsCards users={data.users} />}

          {/* Admin Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <IconSettings className='h-5 w-5' />
                Menu Cepat Admin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                <Button asChild className='justify-between'>
                  <Link href='/dashboard/settings'>
                    Pengaturan
                    <IconArrowRight className='h-4 w-4' />
                  </Link>
                </Button>
                <Button asChild variant='outline' className='justify-between'>
                  <Link href='/dashboard/lembur'>
                    Lembur
                    <IconArrowRight className='h-4 w-4' />
                  </Link>
                </Button>
                <Button asChild variant='outline' className='justify-between'>
                  <Link href='/dashboard/cuti'>
                    Cuti
                    <IconArrowRight className='h-4 w-4' />
                  </Link>
                </Button>
                <Button asChild variant='outline' className='justify-between'>
                  <Link href='/dashboard/medical'>
                    Medical
                    <IconArrowRight className='h-4 w-4' />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Admin: Calendar Full Width */}
          <CalendarCard />

          {/* Admin Own Balance (admin also has leave/medical) */}
          <div>
            <h3 className='text-lg font-semibold mb-4'>Saldo Saya</h3>
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
              <Card className='border-l-4 border-l-amber-400'>
                <CardContent className='p-5'>
                  <div className='flex items-start justify-between'>
                    <div className='space-y-1'>
                      <p className='text-sm text-muted-foreground'>Sisa Cuti</p>
                      <p className='text-3xl font-bold'>{data?.leave?.remaining ?? 0}</p>
                    </div>
                    <IconCalendar className='h-5 w-5 text-amber-400' />
                  </div>
                  <p className='text-sm text-muted-foreground mt-2'>
                    dari {data?.leave?.totalQuota ?? 0} hari
                  </p>
                </CardContent>
              </Card>
              <Card className='border-l-4 border-l-cyan-400'>
                <CardContent className='p-5'>
                  <div className='flex items-start justify-between'>
                    <div className='space-y-1'>
                      <p className='text-sm text-muted-foreground'>Saldo Medical</p>
                      <p className='text-3xl font-bold'>
                        {formatRupiah(Number(data?.mc?.remaining ?? 0))}
                      </p>
                    </div>
                    <IconStethoscope className='h-5 w-5 text-cyan-400' />
                  </div>
                  <p className='text-sm text-muted-foreground mt-2'>
                    dari {formatRupiah(Number(data?.mc?.plafon ?? 0))}
                  </p>
                </CardContent>
              </Card>
              <Card className='border-l-4 border-l-emerald-400'>
                <CardContent className='p-5'>
                  <div className='flex items-start justify-between'>
                    <div className='space-y-1'>
                      <p className='text-sm text-muted-foreground'>Saldo Rawat Inap</p>
                      <p className='text-3xl font-bold'>
                        {formatRupiah(Number(data?.ri?.remaining ?? 0))}
                      </p>
                    </div>
                    <IconBuildingHospital className='h-5 w-5 text-emerald-400' />
                  </div>
                  <p className='text-sm text-muted-foreground mt-2'>
                    dari {formatRupiah(Number(data?.ri?.plafon ?? 0))}
                  </p>
                </CardContent>
              </Card>
              <Card className='border-l-4 border-l-indigo-400'>
                <CardContent className='p-5'>
                  <div className='flex items-start justify-between'>
                    <div className='space-y-1'>
                      <p className='text-sm text-muted-foreground'>Estimasi Pendapatan</p>
                      <p className='text-3xl font-bold text-indigo-600'>
                        {formatRupiah((data?.attendance?.totalUangMakan ?? 0) + (data?.overtime?.totalAmount ?? 0))}
                      </p>
                    </div>
                    <IconClock className='h-5 w-5 text-indigo-400' />
                  </div>
                  <div className='flex flex-col space-y-1 text-sm mt-2'>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Uang Makan ({data?.attendance?.hariHadirReal ?? 0} hari):</span>
                      <span className='font-medium'>{formatRupiah(data?.attendance?.totalUangMakan ?? 0)}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Uang Lembur ({data?.overtime?.totalHours ?? 0} jam):</span>
                      <span className='font-medium'>{formatRupiah(data?.overtime?.totalAmount ?? 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
