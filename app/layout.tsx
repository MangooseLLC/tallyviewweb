import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import PasswordGate from '@/components/shared/PasswordGate';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Tallyview — The Accountability Layer for Public Money',
  description: 'Tallyview connects to nonprofit accounting systems and provides real-time compliance automation and oversight intelligence for funders, regulators, and investigators.',
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
