import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import PasswordGate from '@/components/shared/PasswordGate';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Tallyview — The Accountability Layer for Public Money',
  description: 'Real-time compliance automation and oversight intelligence for the nonprofit sector. Tallyview integrates with existing accounting systems to deliver continuous accountability for every public dollar.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <PasswordGate>
            {children}
          </PasswordGate>
        </AuthProvider>
      </body>
    </html>
  );
}
