'use client';

import DashboardLayout from '@/components/shared/DashboardLayout';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { IncentiveWithRelations } from '@/lib/types/database';
import { formatCurrency, formatDateTime } from '@/lib/utils/helpers';
import { DollarSign, TrendingUp, CheckCircle, Clock } from 'lucide-react';

export default function AdminIncentivesPage() {
  const [incentives, setIncentives] = useState<IncentiveWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncentives();
  }, []);

  const fetchIncentives = async () => {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('incentives')
        .select(`
          *,
          lead:leads(business_name, status),
          intern_profile:profiles!incentives_intern_id_fkey(full_name, role)
        `)
        .order('triggered_at', { ascending: false });

      if (error) throw error;

      setIncentives(data || []);
    } catch (error) {
      console.error('Error fetching incentives:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPending = incentives
    .filter((i) => i.status === 'pending')
    .reduce((sum, i) => sum + i.amount, 0);

  const totalPaid = incentives
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0);

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['admin']}>
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded-lg w-full"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <div>
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Incentives Management</h2>
          <p className="text-gray-600 mt-1">Track and manage team incentives and payouts</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-md">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Incentives</p>
                <p className="text-2xl font-bold text-gray-900">{incentives.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-xl shadow-md border border-yellow-200">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-sm text-yellow-700">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {formatCurrency(totalPending)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-xl shadow-md border border-green-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-green-700">Paid</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-xl shadow-md border border-purple-200">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-purple-700">Total Payout</p>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrency(totalPending + totalPaid)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Incentives Table */}
        {incentives.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-600">No incentives recorded yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Intern
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Triggered
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Paid At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {incentives.map((incentive) => (
                  <tr key={incentive.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      {incentive.intern_profile ? (
                        <div>
                          <p className="font-semibold text-gray-900">
                            {incentive.intern_profile.full_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {incentive.intern_profile.role}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {incentive.lead ? (
                        <div>
                          <p className="font-medium text-gray-900">
                            {incentive.lead.business_name}
                          </p>
                          <p className="text-sm text-gray-600">{incentive.lead.status}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">Unknown Lead</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="font-bold text-green-900 text-lg">
                          {formatCurrency(incentive.amount)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {incentive.status === 'paid' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-green-100 text-green-700 border-green-300">
                          PAID
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-yellow-100 text-yellow-700 border-yellow-300">
                          PENDING
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {formatDateTime(incentive.triggered_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {incentive.paid_at ? (
                        <span className="text-sm text-gray-600">
                          {formatDateTime(incentive.paid_at)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-600">
          Showing {incentives.length} incentives
        </div>
      </div>
    </DashboardLayout>
  );
}
