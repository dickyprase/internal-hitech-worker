'use client';

import { useSession } from 'next-auth/react';
import type { NavItem, NavGroup } from '@/types';

export function useFilteredNavItems(items: NavItem[]) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  return items.filter((item) => {
    if (!item.access) return true;
    if (item.access.role && item.access.role !== role) return false;
    return true;
  });
}

export function useFilteredNavGroups(groups: NavGroup[]) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.access) return true;
        if (item.access.role && item.access.role !== role) return false;
        return true;
      })
    }))
    .filter((group) => group.items.length > 0);
}
