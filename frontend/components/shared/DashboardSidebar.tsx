'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/helpers';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  Users,
  FileText,
  CheckSquare,
  DollarSign,
  ClockIcon,
  PlusCircle,
  Briefcase,
  Folder,
  Database,
  Calendar,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: number; // Optional badge count
}

interface DashboardSidebarProps {
  role: 'admin' | 'sales' | 'intern';
}

export default function DashboardSidebar({ role }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0);
  const [pendingAppointmentRequestsCount, setPendingAppointmentRequestsCount] = useState(0);

  useEffect(() => {
    fetchPendingReviewsCount();
    fetchPendingAppointmentRequests();
    
    // Refresh count every 30 seconds
    const interval = setInterval(() => {
      fetchPendingReviewsCount();
      fetchPendingAppointmentRequests();
    }, 30000);
    return () => clearInterval(interval);
  }, [role]);

  const fetchPendingAppointmentRequests = async () => {
    const supabase = createClient();
    
    try {
      if (role === 'admin' || role === 'sales') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { count } = await supabase
          .from('appointment_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .eq('requested_with', user.id);
        
        setPendingAppointmentRequestsCount(count || 0);
      }
    } catch (error) {
      console.error('[Sidebar] Error fetching appointment requests count:', error);
    }
  };

  const fetchPendingReviewsCount = async () => {
    const supabase = createClient();
    
    try {
      // Count pending items based on role
      if (role === 'admin') {
        const [leadsRes, leadDocsRes, clientDocsRes, reviewsRes] = await Promise.all([
          supabase.from('leads').select('id', { count: 'exact', head: true }).not('proposed_status', 'is', null),
          supabase.from('lead_documents').select('id', { count: 'exact', head: true }).eq('review_status', 'pending'),
          supabase.from('client_documents').select('id', { count: 'exact', head: true }).eq('review_status', 'pending'),
          supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('review_status', 'pending'),
        ]);
        
        const total = (leadsRes.count || 0) + (leadDocsRes.count || 0) + (clientDocsRes.count || 0) + (reviewsRes.count || 0);
        setPendingReviewsCount(total);
      } else {
        // For sales/intern, count their own pending items
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { count } = await supabase
          .from('reviews')
          .select('id', { count: 'exact', head: true })
          .eq('review_status', 'pending')
          .eq('submitted_by', user.id);
        
        setPendingReviewsCount(count || 0);
      }
    } catch (error) {
      console.error('[Sidebar] Error fetching reviews count:', error);
    }
  };

  const getNavItems = (): NavItem[] => {
    switch (role) {
      case 'admin':
        return [
          { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
          { label: 'Leads', href: '/admin/leads', icon: FileText },
          { label: 'Clients', href: '/admin/clients', icon: Briefcase },
          { label: 'Appointments', href: '/admin/appointments', icon: Calendar },
          { label: 'Appointment Requests', href: '/admin/appointment-requests', icon: CheckSquare, badge: pendingAppointmentRequestsCount },
          { label: 'Projects', href: '/admin/projects', icon: Folder },
          { label: 'Review Queue', href: '/admin/reviews', icon: CheckSquare, badge: pendingReviewsCount },
          { label: 'Users', href: '/admin/users', icon: Users },
          { label: 'Attendance', href: '/admin/attendance', icon: ClockIcon },
          { label: 'Data Access', href: '/admin/access', icon: Database },
          { label: 'Incentives', href: '/admin/incentives', icon: DollarSign },
          { label: 'Profile', href: '/admin/profile', icon: Users },
        ];
      case 'sales':
        return [
          { label: 'My Leads', href: '/sales/leads', icon: FileText },
          { label: 'My Clients', href: '/sales/clients', icon: Briefcase },
          { label: 'Appointments', href: '/sales/appointments', icon: Calendar },
          { label: 'My Reviews', href: '/sales/reviews', icon: CheckSquare, badge: pendingReviewsCount },
          { label: 'Profile', href: '/sales/profile', icon: Users },
        ];
      case 'intern':
        return [
          { label: 'Raw Data', href: '/intern/raw-data', icon: Database },
          { label: 'My Leads', href: '/intern/leads', icon: FileText },
          { label: 'My Clients', href: '/intern/clients', icon: Briefcase },
          { label: 'Appointments', href: '/intern/appointments', icon: Calendar },
          { label: 'Create Lead', href: '/intern/create', icon: PlusCircle },
          { label: 'My Reviews', href: '/intern/reviews', icon: CheckSquare, badge: pendingReviewsCount },
          { label: 'Profile', href: '/intern/profile', icon: Users },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-card border-r border-border min-h-screen">
      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative',
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
