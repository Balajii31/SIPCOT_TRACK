'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import type { User } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface SidebarProps {
  user: User;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const getMenuItems = () => {
    const baseItems = [
      { href: '/dashboard/profile', label: 'Profile', roles: ['industry', 'official', 'admin'] },
    ];

    if (user.role === 'industry') {
      return [
        { href: '/dashboard/industry', label: 'Dashboard', roles: ['industry'] },
        { href: '/dashboard/industry/submit-report', label: 'Submit Report', roles: ['industry'] },
        { href: '/dashboard/industry/history', label: 'Report History', roles: ['industry'] },
        { href: '/dashboard/allottee/forms', label: 'Custom Forms', roles: ['industry'] },
        ...baseItems,
      ];
    } else if (user.role === 'official') {
      return [
        { href: '/dashboard/official', label: 'Dashboard', roles: ['official'] },
        { href: '/dashboard/official/monitor', label: 'Monitor Industries', roles: ['official'] },
        { href: '/dashboard/official/reports', label: 'Reports', roles: ['official'] },
        { href: '/dashboard/official/alerts', label: 'Alerts', roles: ['official'] },
        ...baseItems,
      ];
    } else if (user.role === 'admin') {
      return [
        { href: '/admin/dashboard', label: 'Map Dashboard', roles: ['admin'] },
        { href: '/dashboard/admin', label: 'System Overview', roles: ['admin'] },
        { href: '/dashboard/admin/users', label: 'User Management', roles: ['admin'] },
        { href: '/dashboard/admin/forms', label: 'Form Builder', roles: ['admin'] },
        { href: '/dashboard/admin/settings', label: 'Settings', roles: ['admin'] },
        { href: '/dashboard/admin/audit', label: 'Audit Logs', roles: ['admin'] },
        ...baseItems,
      ];
    }

    return baseItems;
  };

  const menuItems = getMenuItems();
  const visibleItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="py-[15px] px-6 border-b border-white/10 bg-[#003366] text-white flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white p-0.5 flex-none shadow-md">
          <Image
            src="/tn_emblem.png"
            alt="Government of Tamil Nadu Emblem"
            width={36}
            height={36}
            className="rounded-full object-contain"
          />
        </div>
        <div>
          <p className="text-white/60 text-[8px] font-semibold tracking-widest uppercase leading-tight">
            Government of Tamil Nadu
          </p>
          <p className="font-extrabold text-sm tracking-wide leading-tight">SIPCOT TRACK</p>
          <p className="text-[9px] text-[#FF9900] font-bold leading-none mt-0.5 uppercase tracking-tighter">
            {user.role} Portal
          </p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {visibleItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'block px-4 py-2 rounded-md text-sm font-medium transition-colors',
              pathname === item.href
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-muted'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border text-sm text-muted-foreground">
        <p>Welcome,</p>
        <p className="font-semibold text-foreground truncate">{user.full_name}</p>
        <p className="text-xs mt-1">{user.email}</p>
      </div>
    </aside>
  );
}
