'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user || !profile) {
        router.push('/login');
      } else {
        // Redirect based on role
        switch (profile.role) {
          case 'admin':
            router.push('/admin/dashboard');
            break;
          case 'sales':
            router.push('/sales/leads');
            break;
          case 'intern':
            router.push('/intern/leads');
            break;
          default:
            router.push('/login');
        }
      }
    }
  }, [user, profile, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
