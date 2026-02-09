'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { personas } from '@/lib/data/personas';
import { PersonaRole } from '@/lib/types';
import {
  Building2,
  Landmark,
  Shield,
  Scale,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const roleIcons: Record<PersonaRole, React.ReactNode> = {
  nonprofit: <Building2 className="h-6 w-6" />,
  foundation: <Landmark className="h-6 w-6" />,
  regulator: <Shield className="h-6 w-6" />,
  investigator: <Scale className="h-6 w-6" />,
};

const roleRoutes: Record<PersonaRole, string> = {
  nonprofit: '/dashboard',
  foundation: '/foundation/dashboard',
  regulator: '/regulator/dashboard',
  investigator: '/investigator/dashboard',
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = (personaId: string, role: PersonaRole) => {
    login(personaId);
    router.push(roleRoutes[role]);
  };

  return (
    <div className="min-h-screen bg-brand-navy flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Logo & Header */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <Image
              src="/tallyview-logo.svg"
              alt="Tallyview"
              width={280}
              height={78}
              className="h-14 w-auto brightness-0 invert"
              priority
            />
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white max-w-2xl mx-auto leading-tight">
            The Accountability Intelligence Layer<br />
            <span className="text-brand-gold">
              for Public Money
            </span>
          </h1>
          <p className="mt-4 text-gray-400 text-lg">Select a role to explore the platform</p>
        </div>

        {/* Persona Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full">
          {personas.map((persona) => (
            <button
              key={persona.id}
              onClick={() => handleLogin(persona.id, persona.role)}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 text-left transition-all duration-300 hover:bg-white/10 hover:border-brand-gold/40 hover:shadow-xl hover:shadow-brand-gold/5 hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className={cn(
                  'h-14 w-14 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg flex-shrink-0',
                  persona.color
                )}>
                  {roleIcons[persona.role]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">{persona.name}</h3>
                    <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-brand-gold group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">{persona.title}</p>
                  <p className="text-sm text-brand-gold/80 font-medium mt-1">{persona.organization}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{persona.orgDetail}</p>
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-xs text-gray-400">{persona.description}</p>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center space-y-2">
        <Link
          href="/case-files"
          className="inline-flex items-center gap-2 text-xs font-semibold text-brand-gold hover:text-brand-gold-light"
        >
          <FileText className="h-3.5 w-3.5" />
          Tallyview Case Files
        </Link>
        <p className="text-xs text-gray-500">
          Demo environment with synthetic data &bull; Tallyview &copy; 2026
        </p>
      </footer>
    </div>
  );
}
