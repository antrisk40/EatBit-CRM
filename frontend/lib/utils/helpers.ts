import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { LeadStatus, ReviewStatus, UserRole } from '@/lib/types/database';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  if (!date) return '';
  return format(new Date(date), 'MMM dd, yyyy');
}

export function formatDateTime(date: string | Date): string {
  if (!date) return '';
  return format(new Date(date), 'MMM dd, yyyy hh:mm a');
}

export function formatCurrency(amount: number | undefined): string {
  if (!amount) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getStatusColor(status: LeadStatus): string {
  const colors: Record<LeadStatus, string> = {
    new: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
    contacted: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    qualified: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    proposal_sent: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
    closed_won: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    closed_lost: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  };
  return colors[status] || colors.new;
}

export function getReviewStatusColor(status: ReviewStatus): string {
  const colors: Record<ReviewStatus, string> = {
    pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
    approved: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  };
  return colors[status];
}

export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    admin: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    sales: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    intern: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  };
  return colors[role];
}

export function getStatusLabel(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Wraps a Supabase API call with automatic token refresh on auth errors and timeout
 * This prevents the app from getting stuck when tokens expire or requests hang
 */
export async function withAuthRefresh<T>(
  apiCall: () => Promise<T>,
  supabase: any,
  options: { retries?: number; timeout?: number } = {}
): Promise<T> {
  const { retries = 1, timeout = 30000 } = options; // 30 second default timeout

  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Request timeout: The operation took too long to complete.'));
    }, timeout);
  });

  const executeWithRetry = async (attempt: number): Promise<T> => {
    try {
      // Race between the API call and timeout
      return await Promise.race([apiCall(), timeoutPromise]);
    } catch (error: any) {
      // Check if it's a timeout error
      if (error?.message?.includes('timeout')) {
        throw error;
      }

      // Check if it's an auth error
      const isAuthError = 
        error?.message?.includes('JWT') ||
        error?.message?.includes('token') ||
        error?.message?.includes('expired') ||
        error?.message?.includes('Invalid API key') ||
        error?.message?.includes('invalid_token') ||
        error?.code === 'PGRST301' ||
        error?.status === 401 ||
        error?.statusCode === 401;

      if (isAuthError && attempt < retries) {
        console.warn(`[withAuthRefresh] Auth error detected (attempt ${attempt + 1}/${retries}), attempting token refresh...`, error.message);
        
        try {
          // Try to refresh the session
          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !session) {
            console.error('[withAuthRefresh] Token refresh failed, signing out:', refreshError);
            // If refresh fails, sign out to clear invalid session
            await supabase.auth.signOut();
            // Force page reload to clear all state
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            throw new Error('Session expired. Please log in again.');
          }
          
          console.log('[withAuthRefresh] Token refreshed successfully, retrying API call...');
          // Retry the API call after refresh
          return await executeWithRetry(attempt + 1);
        } catch (refreshError: any) {
          console.error('[withAuthRefresh] Error during token refresh:', refreshError);
          // If refresh fails, sign out and redirect
          await supabase.auth.signOut();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          throw new Error('Session expired. Please log in again.');
        }
      }
      
      // If not an auth error or retries exhausted, throw the original error
      throw error;
    }
  };

  return executeWithRetry(0);
}