'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { GuidedTour } from '@/components/shared/GuidedTour';
import { ArrowRight } from 'lucide-react';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isDemoMode, currentPersona } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 rounded-full border-2 border-brand-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {isDemoMode && (
          <div className="flex items-center justify-between bg-brand-navy px-4 py-1.5 text-xs text-white">
            <span className="font-medium">
              Demo Mode &mdash; viewing as {currentPersona?.name}
            </span>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1 rounded bg-brand-gold/20 px-2 py-0.5 text-brand-gold hover:bg-brand-gold/30 transition"
            >
              Create a real account <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      {isDemoMode && <GuidedTour personaId={currentPersona?.id ?? null} />}
    </div>
  );
}
