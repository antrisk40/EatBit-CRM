'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/types/database';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<Profile | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Simple profile fetch - no retries, no complex logic
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[AuthContext] Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[AuthContext] Exception fetching profile:', error);
      return null;
    }
  }, [supabase]);

  // Simple sign in
  const signIn = useCallback(async (email: string, password: string): Promise<Profile | null> => {
    try {
      // Sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('No user data returned');
      }

      // Fetch profile
      const profileData = await fetchProfile(authData.user.id);
      
      if (!profileData) {
        // Sign out if profile not found
        await supabase.auth.signOut();
        throw new Error('User profile not found');
      }

      // Set state
      setUser(authData.user);
      setProfile(profileData);

      // Log attendance (non-blocking - fire and forget)
      (async () => {
        try {
          await supabase
            .from('attendance_logs')
            .insert({
              user_id: authData.user.id,
              login_time: new Date().toISOString(),
            });
        } catch (err) {
          console.warn('[AuthContext] Attendance log error:', err);
        }
      })();

      return profileData;
    } catch (error: any) {
      console.error('[AuthContext] Sign in error:', error);
      setUser(null);
      setProfile(null);
      throw error;
    }
  }, [supabase, fetchProfile]);

  // Simple sign out
  const signOut = useCallback(async () => {
    try {
      const currentUser = user;
      
      // Clear state immediately
      setUser(null);
      setProfile(null);

      // Log attendance (non-blocking - fire and forget)
      if (currentUser) {
        (async () => {
          try {
            await supabase
              .from('attendance_logs')
              .update({ logout_time: new Date().toISOString() })
              .eq('user_id', currentUser.id)
              .is('logout_time', null);
          } catch (err) {
            console.warn('[AuthContext] Attendance log error:', err);
          }
        })();
      }

      // Sign out from Supabase
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[AuthContext] Sign out error:', error);
      // Force clear state even on error
      setUser(null);
      setProfile(null);
    }
  }, [user, supabase]);

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  }, [user, fetchProfile]);

  // Initialize auth - simple and clean
  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;

      if (error) {
        console.error('[AuthContext] Session error:', error);
        setLoading(false);
        return;
      }

      if (session?.user) {
        setUser(session.user);
        // Fetch profile
        fetchProfile(session.user.id).then(profileData => {
          if (mounted) {
            setProfile(profileData);
            setLoading(false);
          }
        }).catch(() => {
          if (mounted) {
            setLoading(false);
          }
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        const profileData = await fetchProfile(session.user.id);
        if (mounted) {
          setProfile(profileData);
          setLoading(false);
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Just update user, don't refetch profile
        setUser(session.user);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
