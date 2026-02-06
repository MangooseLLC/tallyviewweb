import { Persona } from '../types';

export const personas: Persona[] = [
  {
    id: 'sarah-chen',
    name: 'Sarah Chen',
    title: 'Executive Director',
    organization: 'Bright Futures Youth Services',
    orgDetail: '$4.2M budget',
    role: 'nonprofit',
    description: 'Nonprofit compliance & reporting',
    avatar: 'SC',
    color: 'from-amber-400 to-amber-600',
  },
  {
    id: 'marcus-thompson',
    name: 'Marcus Thompson',
    title: 'Program Officer',
    organization: 'Pacific Northwest Community Foundation',
    orgDetail: '$340M portfolio, 200+ grantees',
    role: 'foundation',
    description: 'Foundation portfolio oversight',
    avatar: 'MT',
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
    id: 'jessica-park',
    name: 'Jessica Park',
    title: 'Senior Associate',
    organization: 'Whitfield & Associates LLP',
    orgDetail: 'Qui tam litigation',
    role: 'investigator',
    description: 'Fraud investigation workbench',
    avatar: 'JP',
    color: 'from-orange-500 to-red-600',
  },
];

export function getPersonaById(id: string): Persona | undefined {
  return personas.find(p => p.id === id);
}

export function getPersonaByRole(role: string): Persona | undefined {
  return personas.find(p => p.role === role);
}
