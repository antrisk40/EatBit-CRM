'use client';

import DashboardHeader from '@/components/shared/DashboardHeader';
import DashboardSidebar from '@/components/shared/DashboardSidebar';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  allowedRoles: ('admin' | 'sales' | 'intern')[];
}

export default function DashboardLayout({ children, allowedRoles }: DashboardLayoutProps) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!profile || !allowedRoles.includes(profile.role))) {
      router.push('/login');
    }
  }, [profile, loading, allowedRoles, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 animate-pulse">
        {/* Skeleton Header */}
        <div className="h-16 bg-white border-b border-gray-200"></div>
        <div className="flex">
          {/* Skeleton Sidebar */}
          <div className="w-64 min-h-screen bg-white border-r border-gray-200 hidden md:block"></div>
          {/* Skeleton Content */}
          <main className="flex-1 p-6 space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </main>
        </div>
      </div>
    );
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="flex">
        <DashboardSidebar role={profile.role} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
