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
  UserCircle,
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

const roleHighlights: Record<PersonaRole, string> = {
  nonprofit: 'Manages $4.2M annual budget across 3 programs',
  foundation: 'Oversees $12M in active grants to 24 grantees',
  regulator: 'Monitors 2,400+ nonprofits across Oregon',
  investigator: 'Leads forensic investigations into nonprofit fraud',
};

export default function DemoPage() {
  const router = useRouter();
  const { login } = useAuth();

  const handleDemoLogin = (personaId: string, role: PersonaRole) => {
    login(personaId);
    router.push(roleRoutes[role]);
  };

  return (
    <div className="min-h-screen bg-brand-navy flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-10">
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
            Explore the Demo
          </h1>
          <p className="mt-3 text-sm text-gray-400 max-w-md mx-auto">
            Choose a persona to see Tallyview from different perspectives. All data is synthetic.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full">
          {personas.map((persona) => (
            <button
              key={persona.id}
              onClick={() => handleDemoLogin(persona.id, persona.role)}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 text-left transition-all duration-300 hover:bg-white/10 hover:border-brand-gold/40 hover:shadow-xl hover:shadow-brand-gold/5 hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  'h-14 w-14 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg flex-shrink-0',
                  persona.color
                )}>
                  {roleIcons[persona.role]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">{persona.name}</h3>
                    <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-brand-gold group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">{persona.title}</p>
                  <p className="text-sm text-brand-gold/80 font-medium mt-1">{persona.organization}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                    <UserCircle className="h-3 w-3" />
                    {roleHighlights[persona.role]}
                  </p>
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-xs text-gray-400">{persona.description}</p>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-semibold text-brand-navy transition hover:bg-brand-gold-light"
          >
            Create a real account
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/case-files"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
          >
            <FileText className="h-3.5 w-3.5" />
            Case Files
          </Link>
        </div>
      </div>

      <footer className="py-4 text-center">
        <p className="text-xs text-gray-500">
          Demo environment with synthetic data &bull; Tallyview &copy; 2026
        </p>
      </footer>
    </div>
  );
}
