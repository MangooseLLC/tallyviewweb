import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import PasswordGate from '@/components/shared/PasswordGate';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Tallyview — Accountability Intelligence for Public Money',
  description: 'AI-powered accountability intelligence platform for public money. The Plaid for nonprofit accountability.',
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
