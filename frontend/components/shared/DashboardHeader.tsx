'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { LogOut, User, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { getRoleBadgeColor, getInitials } from '@/lib/utils/helpers';
import { useEffect, useState } from 'react';
import { Briefcase } from 'lucide-react';
import NotificationBell from './NotificationBell';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="p-2 w-9 h-9" />;

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
      title="Toggle Theme"
    >
      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

export default function DashboardHeader() {
  const { profile, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('[DashboardHeader] Error during logout:', error);
    } finally {
      // Always redirect to login
      router.push('/login');
    }
  };

  if (!profile) return null;

  return (
    <header className="bg-background border-b border-border sticky top-0 z-10 shadow-sm">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600 rounded-lg">
             <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">EatBit <span className="text-blue-600">CRM</span></h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lead Management System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          
          <NotificationBell />
          
          <div className="h-8 w-[1px] bg-border" />

          <div className="text-right hidden sm:block">
            <p className="font-bold text-foreground leading-tight">{profile.full_name}</p>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border ${getRoleBadgeColor(
                profile.role
              )}`}
            >
              {profile.role.toUpperCase()}
            </span>
          </div>
 
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
            {getInitials(profile.full_name)}
          </div>
 
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group"
            title="Logout"
          >
            <LogOut className="w-5 h-5 text-muted-foreground group-hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>
    </header>
  );
}

