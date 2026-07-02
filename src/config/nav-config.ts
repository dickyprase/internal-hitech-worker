import { NavGroup } from '@/types';

export const navGroups: NavGroup[] = [
  {
    label: 'Menu Utama',
    items: [
      {
        title: 'Dashboard',
        url: '/dashboard',
        icon: 'dashboard',
        isActive: false,
        shortcut: ['d', 'd'],
        items: []
      },
      {
        title: 'Lembur',
        url: '/dashboard/lembur',
        icon: 'product',
        shortcut: ['l', 'l'],
        isActive: false,
        items: []
      },
      {
        title: 'Cuti',
        url: '/dashboard/cuti',
        icon: 'kanban',
        shortcut: ['c', 'c'],
        isActive: false,
        items: []
      },
      {
        title: 'Medical Checkup',
        url: '/dashboard/medical',
        icon: 'notification',
        shortcut: ['m', 'm'],
        isActive: false,
        items: []
      },
      {
        title: 'Rawat Inap',
        url: '/dashboard/rawat-inap',
        icon: 'notification',
        shortcut: ['r', 'r'],
        isActive: false,
        items: []
      }
    ]
  },
  {
    label: 'Akun',
    items: [
      {
        title: 'Profil',
        url: '/dashboard/profil',
        icon: 'account',
        isActive: false,
        items: []
      }
    ]
  },
  {
    label: 'Admin',
    items: [
      {
        title: 'Karyawan',
        url: '/dashboard/admin/users',
        icon: 'teams',
        isActive: false,
        access: { role: 'admin' },
        items: []
      },
      {
        title: 'Pengaturan',
        url: '/dashboard/settings',
        icon: 'settings',
        isActive: false,
        access: { role: 'admin' },
        items: []
      }
    ]
  }
];
