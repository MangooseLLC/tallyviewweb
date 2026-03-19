import { Persona } from '../types';

export const personas: Persona[] = [
  {
    id: 'katy-alyst',
    name: 'Katy Alyst',
    title: 'Executive Director',
    organization: 'Bright Futures Youth Services',
    orgDetail: '$4.2M budget',
    role: 'nonprofit',
    description: 'Nonprofit compliance & reporting',
    avatar: 'KA',
    color: 'from-amber-400 to-amber-600',
  },
  {
    id: 'grant-wishman',
    name: 'Grant Wishman',
    title: 'Program Officer',
    organization: 'Pacific Northwest Community Foundation',
    orgDetail: '$340M portfolio, 200+ grantees',
    role: 'foundation',
    description: 'Foundation portfolio oversight',
    avatar: 'GW',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'director-rivera',
    name: 'Director Rivera',
    title: 'Deputy Attorney General',
    organization: 'State of Oregon, Charitable Activities Section',
    orgDetail: 'Regulatory oversight',
    role: 'regulator',
    description: 'Regulatory oversight & investigation triage',
    avatar: 'DR',
    color: 'from-purple-500 to-violet-600',
  },
  {
    id: 'bill-label',
    name: 'Bill Label',
    title: 'Senior Associate',
    organization: 'Whitfield & Associates LLP',
    orgDetail: 'Qui tam litigation',
    role: 'investigator',
    description: 'Fraud investigation workbench',
    avatar: 'BL',
    color: 'from-orange-500 to-red-600',
  },
];

export function getPersonaById(id: string): Persona | undefined {
  return personas.find(p => p.id === id);
}

export function getPersonaByRole(role: string): Persona | undefined {
  return personas.find(p => p.role === role);
}
