'use client';

import DashboardLayout from '@/components/shared/DashboardLayout';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AttendanceLogWithUser, Profile } from '@/lib/types/database';
import { formatDateTime, getRoleBadgeColor, formatDate, getInitials } from '@/lib/utils/helpers';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  Search, 
  ChevronRight,
  ArrowLeft,
  History,
  Activity,
  UserCheck,
  Calendar
} from 'lucide-react';
import { differenceInMinutes, differenceInHours, isToday, format } from 'date-fns';

interface UserAttendanceStats extends Profile {
  lastLog?: AttendanceLogWithUser;
  todayDuration: number; // in minutes
  totalLogs: number;
  isActive: boolean;
}

export default function AdminAttendancePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [logs, setLogs] = useState<AttendanceLogWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'detail'>('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: logsData, error: logsError } = await supabase
        .from('attendance_logs')
        .select(`
          *,
          user_profile:profiles!attendance_logs_user_id_fkey(id, full_name, role)
        `)
        .gte('login_time', thirtyDaysAgo.toISOString())
        .order('login_time', { ascending: false });

      if (logsError) throw logsError;
      setLogs(logsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (loginTime: string, logoutTime?: string) => {
    const login = new Date(loginTime);
    const logout = logoutTime ? new Date(logoutTime) : new Date();
    const hours = differenceInHours(logout, login);
    const minutes = differenceInMinutes(logout, login) % 60;
    return { hours, minutes, totalMinutes: differenceInMinutes(logout, login) };
  };

  const getUserStats = (): UserAttendanceStats[] => {
    return profiles.map(profile => {
      const userLogs = logs.filter(log => log.user_id === profile.id);
      const lastLog = userLogs[0];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayDuration = userLogs
        .filter(log => new Date(log.login_time) >= today)
        .reduce((acc, log) => acc + calculateDuration(log.login_time, log.logout_time || undefined).totalMinutes, 0);

      return {
        ...profile,
        lastLog,
        todayDuration,
        totalLogs: userLogs.length,
        isActive: lastLog ? !lastLog.logout_time && isToday(new Date(lastLog.login_time)) : false
      };
    });
  };

  const filteredStats = getUserStats().filter(stat => 
    stat.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUser = profiles.find(p => p.id === selectedUserId);
  const selectedUserLogs = logs.filter(log => log.user_id === selectedUserId);

  const groupedLogs: Record<string, AttendanceLogWithUser[]> = selectedUserLogs.reduce((acc, log) => {
    const date = formatDate(log.login_time);
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {} as Record<string, AttendanceLogWithUser[]>);

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['admin']}>
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded-lg w-full"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <div className="min-h-screen p-6 lg:p-10">
        {viewMode === 'overview' ? (
          <div className="transition-all duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Team Attendance</h1>
                <p className="text-gray-500 mt-2 text-lg">Monitor activity and work hours</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl w-64 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
                <div className="p-4 bg-green-50 rounded-2xl">
                  <UserCheck className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Online Now</p>
                  <p className="text-3xl font-bold text-gray-900">{filteredStats.filter(s => s.isActive).length}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
                <div className="p-4 bg-blue-50 rounded-2xl">
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Avg. Work Today</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {Math.round(filteredStats.reduce((acc, s) => acc + s.todayDuration, 0) / (filteredStats.length || 1))}m
                  </p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
                <div className="p-4 bg-purple-50 rounded-2xl">
                  <Activity className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Active</p>
                  <p className="text-3xl font-bold text-gray-900">{filteredStats.filter(s => s.totalLogs > 0).length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">User Details</th>
                      <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Current Status</th>
                      <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Today's Duration</th>
                      <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Last Activity</th>
                      <th className="px-8 py-5 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredStats.map((stat) => (
                      <tr 
                        key={stat.id}
                        className="hover:bg-blue-50/20 transition-all cursor-pointer group"
                        onClick={() => {
                          setSelectedUserId(stat.id);
                          setViewMode('detail');
                        }}
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200">
                              {getInitials(stat.full_name)}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">{stat.full_name}</p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter border ${getRoleBadgeColor(stat.role as any)}`}>
                                {stat.role}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          {stat.isActive ? (
                            <div className="flex items-center gap-2">
                              <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                              </span>
                              <span className="text-green-700 font-bold ml-2">ACTIVE NOW</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-400">
                              <span className="w-3 h-3 bg-gray-300 rounded-full"></span>
                              <span className="font-medium">OFFLINE</span>
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-2xl font-black text-gray-800">
                              {Math.floor(stat.todayDuration / 60)}h {stat.todayDuration % 60}m
                            </span>
                            <div className="w-32 h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
                                style={{ width: `${Math.min((stat.todayDuration / 480) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-sm text-gray-600">
                          {stat.lastLog ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <LogIn className="w-4 h-4 text-green-500" />
                                <span>{formatDateTime(stat.lastLog.login_time)}</span>
                              </div>
                              {stat.lastLog.logout_time && (
                                <div className="flex items-center gap-2 text-sm">
                                  <LogOut className="w-4 h-4 text-red-500" />
                                  <span>{formatDateTime(stat.lastLog.logout_time)}</span>
                                </div>
                              )}
                            </div>
                          ) : 'No activity'}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="inline-flex p-3 bg-gray-50 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm group-hover:scale-110">
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto transition-all duration-300">
            <button 
              onClick={() => setViewMode('overview')}
              className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold mb-8 group transition-all"
            >
              <div className="p-2 bg-white rounded-xl shadow-sm group-hover:-translate-x-1 transition-transform">
                <ArrowLeft className="w-5 h-5" />
              </div>
              Back to Overview
            </button>

            <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
              <div className="p-10 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-[2rem] border-2 border-white/30 flex items-center justify-center text-3xl font-black">
                    {getInitials(selectedUser?.full_name || '')}
                  </div>
                  <div>
                    <h2 className="text-4xl font-black">{selectedUser?.full_name}</h2>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-bold border border-white/30">
                        {selectedUser?.role.toUpperCase()}
                      </span>
                      <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/30 text-xs">
                        <Activity className="w-3 h-3" />
                        {selectedUserLogs.length} Sessions (Last 30 days)
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-black/10 p-6 rounded-3xl backdrop-blur-sm border border-white/10">
                  <div className="text-center px-4 border-r border-white/10 text-nowrap">
                    <p className="text-xs font-bold text-blue-100 uppercase mb-1">Status</p>
                    {getUserStats().find(s => s.id === selectedUserId)?.isActive ? (
                      <span className="flex items-center gap-1.5 font-black text-green-300 uppercase">
                         <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> ONLINE
                      </span>
                    ) : (
                      <span className="font-black text-blue-200">OFFLINE</span>
                    )}
                  </div>
                  <div className="text-center px-4 text-nowrap">
                    <p className="text-xs font-bold text-blue-100 uppercase mb-1">Today's Work</p>
                    <p className="text-2xl font-black">
                      {Math.floor((getUserStats().find(s => s.id === selectedUserId)?.todayDuration || 0) / 60)}h {(getUserStats().find(s => s.id === selectedUserId)?.todayDuration || 0) % 60}m
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 lg:p-12">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                    <History className="w-7 h-7 text-blue-600" />
                    Session History
                  </h3>
                </div>

                <div className="space-y-12">
                  {Object.entries(groupedLogs).length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                      <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium tracking-tight">No history found for this user.</p>
                    </div>
                  ) : Object.entries(groupedLogs).map(([date, dayLogs]) => (
                    <div key={date} className="relative pl-12 border-l-2 border-blue-100">
                      <div className="absolute left-[-9px] top-0 w-4 h-4 bg-white border-2 border-blue-600 rounded-full z-10"></div>
                      
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-xl font-bold text-gray-900">{date}</h4>
                        <span className="text-sm font-bold px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                          {Math.floor(dayLogs.reduce((acc, l) => acc + calculateDuration(l.login_time, l.logout_time || undefined).totalMinutes, 0) / 60)}h {dayLogs.reduce((acc, l) => acc + calculateDuration(l.login_time, l.logout_time || undefined).totalMinutes, 0) % 60}m Day Total
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dayLogs.map((log) => {
                          const dur = calculateDuration(log.login_time, log.logout_time || undefined);
                          return (
                            <div key={log.id} className="bg-gray-50/50 p-6 rounded-[1.5rem] border border-gray-100 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all group">
                              <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                  <Clock className="w-6 h-6" />
                                </div>
                                <span className={`text-xs font-black px-3 py-1 rounded-full ${log.logout_time ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-green-700 animate-pulse'}`}>
                                  {log.logout_time ? 'COMPLETED' : 'ACTIVE'}
                                </span>
                              </div>
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-sm text-gray-400 font-bold uppercase tracking-tighter">
                                    <LogIn className="w-4 h-4 text-green-400" /> Login
                                  </div>
                                  <span className="font-bold text-gray-800">{format(new Date(log.login_time), 'hh:mm a')}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-sm text-gray-400 font-bold uppercase tracking-tighter">
                                    <LogOut className="w-4 h-4 text-red-400" /> Logout
                                  </div>
                                  <span className="font-bold text-gray-800">{log.logout_time ? format(new Date(log.logout_time), 'hh:mm a') : 'Ongoing'}</span>
                                </div>
                                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Session Time</span>
                                  <span className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">
                                    {dur.hours}h {dur.minutes}m
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
