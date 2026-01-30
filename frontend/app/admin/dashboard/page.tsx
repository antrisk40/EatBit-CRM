'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/shared/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { 
  Users, 
  TrendingUp, 
  CheckCircle, 
  Clock,
  DollarSign,
  UserPlus,
  Briefcase,
  CalendarCheck
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalLeads: number;
  activeLeads: number;
  closedWonLeads: number;
  totalClients: number;
  activeClients: number;
  pendingReviews: number;
  upcomingAppointments: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalLeads: 0,
    activeLeads: 0,
    closedWonLeads: 0,
    totalClients: 0,
    activeClients: 0,
    pendingReviews: 0,
    upcomingAppointments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const supabase = createClient();

    try {
      // Fetch all stats in parallel
      const [
        usersRes,
        leadsRes,
        activeLeadsRes,
        closedWonRes,
        clientsRes,
        activeClientsRes,
        reviewsRes,
        leadProposalsRes,
        appointmentsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase.from('leads').select('id', { count: 'exact', head: true }).in('status', ['new', 'contacted', 'qualified', 'proposal_sent']),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'closed_won'),
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('review_status', 'pending'),
        supabase.from('leads').select('id', { count: 'exact', head: true }).not('proposed_status', 'is', null),
        supabase.from('client_appointments').select('id', { count: 'exact', head: true })
          .eq('status', 'scheduled')
          .gte('scheduled_at', new Date().toISOString()),
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalLeads: leadsRes.count || 0,
        activeLeads: activeLeadsRes.count || 0,
        closedWonLeads: closedWonRes.count || 0,
        totalClients: clientsRes.count || 0,
        activeClients: activeClientsRes.count || 0,
        pendingReviews: (reviewsRes.count || 0) + (leadProposalsRes.count || 0),
        upcomingAppointments: appointmentsRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Active Leads',
      value: stats.activeLeads,
      icon: TrendingUp,
      color: 'bg-orange-500',
      lightColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
    {
      title: 'Won Deals',
      value: stats.closedWonLeads,
      icon: CheckCircle,
      color: 'bg-green-500',
      lightColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Pending Reviews',
      value: stats.pendingReviews,
      icon: Clock,
      color: 'bg-yellow-500',
      lightColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
    },
    {
      title: 'Total Clients',
      value: stats.totalClients,
      icon: Briefcase,
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'Active Clients',
      value: stats.activeClients,
      icon: UserPlus,
      color: 'bg-indigo-500',
      lightColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
    },
    {
      title: 'Upcoming Appointments',
      value: stats.upcomingAppointments,
      icon: CalendarCheck,
      color: 'bg-pink-500',
      lightColor: 'bg-pink-50',
      textColor: 'text-pink-600',
    },
    {
      title: 'Total Leads',
      value: stats.totalLeads,
      icon: DollarSign,
      color: 'bg-cyan-500',
      lightColor: 'bg-cyan-50',
      textColor: 'text-cyan-600',
    },
  ];

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['admin']}>
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-2">Welcome back! Here's what's happening with your CRM.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`${stat.lightColor} p-3 rounded-lg`}>
                    <Icon className={`w-6 h-6 ${stat.textColor}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/admin/leads"
              className="block bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all hover:border-blue-200"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-blue-50 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Manage Leads</h3>
                  <p className="text-sm text-gray-600">View and manage all leads</p>
                </div>
              </div>
            </a>

            <a
              href="/admin/reviews"
              className="block bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all hover:border-yellow-200"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-yellow-50 p-2 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Pending Reviews</h3>
                  <p className="text-sm text-gray-600">{stats.pendingReviews} items need review</p>
                </div>
              </div>
            </a>

            <a
              href="/admin/users"
              className="block bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all hover:border-purple-200"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-purple-50 p-2 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Manage Users</h3>
                  <p className="text-sm text-gray-600">Add or edit team members</p>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
