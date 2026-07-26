'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { parentNav } from '@/lib/nav/parent';

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout navSections={parentNav} role="parent">
      {children}
    </DashboardLayout>
  );
}
