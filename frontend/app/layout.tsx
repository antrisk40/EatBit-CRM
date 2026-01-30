import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { ThemeProvider } from '@/components/shared/ThemeProvider';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'EatBit CRM - Lead Management System',
  description: 'Professional CRM for managing leads, follow-ups, and sales team',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem>
          <AuthProvider>
            <Toaster position="top-right" />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
