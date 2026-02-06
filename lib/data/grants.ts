import { Grant } from '../types';
import { nonprofits } from './nonprofits';

// Generate grants for the foundation portfolio
export const grants: Grant[] = nonprofits.map((org, index) => {
  const grantAmount = Math.round(org.annualBudget * (0.03 + Math.random() * 0.12));
  const startMonth = Math.floor(Math.random() * 12);
  const startDate = new Date(2025, startMonth, 1);
  const endDate = new Date(2026, startMonth + 12, 1);
  const elapsedPercent = Math.min(100, Math.max(5, ((new Date('2026-02-06').getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())) * 100));

  let utilization: number;
  if (org.id === 'org-nw-digital') {
    utilization = 12;
  } else if (org.riskScore < 45) {
    utilization = Math.round(elapsedPercent * (0.4 + Math.random() * 0.3));
  } else {
    utilization = Math.round(elapsedPercent * (0.7 + Math.random() * 0.3));
  }

  return {
    id: `grant-${String(index + 1).padStart(3, '0')}`,
    foundationId: 'foundation-pnw',
    granteeId: org.id,
    granteeName: org.name,
    amount: grantAmount,
    programArea: org.programArea,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    status: org.riskScore < 35 ? 'Suspended' as const : 'Active' as const,
    utilizationPercent: Math.min(100, utilization),
  };
});

// Add some extra grants for larger portfolio
const additionalGrantees = [
  'Willamette Valley Mentors', 'Cascade Health Partners', 'Portland Housing First',
  'Oregon Trail Education', 'Blue Mountain Arts', 'High Desert Youth Corps',
  'Pacific Shores Recovery', 'Columbia Basin Meals', 'Crater Lake Conservation',
  'Mt. Hood Youth Summit', 'Rogue Valley STEM', 'Coast Range Environmental',
  'Umpqua Community Health', 'Mid-Valley Food Alliance', 'Tualatin Hills Arts',
  'Sandy River Conservation', 'Clatsop County Education', 'Curry Coast Health',
  'Jefferson County Youth', 'Deschutes Arts Council', 'Harney Basin Food Bank',
  'John Day Community Center', 'Malheur County Family Services', 'Baker City Heritage',
  'Enterprise Arts Collective', 'La Grande Education Fund', 'Prineville Youth Development',
  'Madras Community Health', 'Warm Springs Education', 'Silverton Arts Center',
  'Canby Community Services', 'Woodburn Family Center', 'Dallas Youth Athletics',
  'Monmouth Education Alliance', 'Independence Arts Council', 'Mt. Angel Heritage',
  'Stayton Community Health', 'Aumsville Youth Services', 'Turner Food Bank',
  'Sublimity Community Center', 'Mill City Arts', 'Sweet Home Youth Programs',
  'Lebanon Community Health', 'Harrisburg Education Fund', 'Cottage Grove Arts',
  'Creswell Community Services', 'Veneta Youth Development', 'Florence Ocean Health',
  'Reedsport Marine Education', 'Brookings Community Center', 'Gold Beach Heritage',
  'Port Orford Conservation', 'Bandon Arts Council', 'Myrtle Point Youth',
  'Powers Community Services', 'Drain Education Alliance', 'Elkton Heritage Center',
  'Oakland Youth Athletics', 'Sutherlin Community Health', 'Winston Family Services',
  'Riddle Arts Collective', 'Glide Education Fund', 'Myrtle Creek Youth',
  'Canyonville Community Center',
];

additionalGrantees.forEach((name, i) => {
  const amount = Math.round(50000 + Math.random() * 300000);
  const areas: Array<Grant['programArea']> = ['Youth Services', 'Health', 'Education', 'Environment', 'Arts', 'Housing', 'Community Development', 'Food Security'];
  grants.push({
    id: `grant-ext-${String(i + 1).padStart(3, '0')}`,
    foundationId: 'foundation-pnw',
    granteeId: `org-ext-${i + 1}`,
    granteeName: name,
    amount,
    programArea: areas[i % areas.length],
    startDate: '2025-03-01',
    endDate: '2026-09-01',
    status: 'Active',
    utilizationPercent: Math.round(30 + Math.random() * 60),
  });
});

export function getGrantsByGrantee(granteeId: string): Grant[] {
  return grants.filter(g => g.granteeId === granteeId);
}

export function getTotalPortfolioValue(): number {
  return grants.filter(g => g.status === 'Active').reduce((sum, g) => sum + g.amount, 0);
}

export function getGrantsByProgramArea(area: string): Grant[] {
  return grants.filter(g => g.programArea === area);
}
