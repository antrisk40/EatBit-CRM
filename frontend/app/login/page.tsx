'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, user, profile } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user && profile) {
      console.log('[Login] User already logged in, redirecting...');
      if (profile.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (profile.role === 'sales') {
        router.push('/sales/leads');
      } else if (profile.role === 'intern') {
        router.push('/intern/raw-data');
      }
    }
  }, [user, profile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await signIn(email, password);
      console.log('Login successful! User profile:', user);
      console.log('User role:', user?.role);
      toast.success('Login successful!');
      
      // Redirect based on role
      if (user?.role === 'admin') {
        console.log('Redirecting to admin dashboard');
        router.push('/admin/dashboard');
      } else if (user?.role === 'sales') {
        console.log('Redirecting to sales leads');
        router.push('/sales/leads');
      } else if (user?.role === 'intern') {
        console.log('Redirecting to intern raw-data');
        router.push('/intern/raw-data');
      } else {
        console.log('No valid role, redirecting to login. Role was:', user?.role);
        router.push('/login');
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <Toaster position="top-right" />
      <div className="bg-card p-8 rounded-2xl shadow-2xl w-full max-w-md border border-border">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-foreground mb-2">EatBit <span className="text-blue-600">CRM</span></h1>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>
 
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-foreground mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none bg-background text-foreground"
              placeholder="your@email.com"
            />
          </div>
 
          <div>
            <label htmlFor="password" className="block text-sm font-bold text-foreground mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none bg-background text-foreground"
              placeholder="••••••••"
            />
          </div>
 
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
 
      </div>
    </div>
  );
}
