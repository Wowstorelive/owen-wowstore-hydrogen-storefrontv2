/**
 * Shared types for Virtue Impact - can be used in both client and server
 */

export type VirtueCause =
  | 'education'
  | 'environment'
  | 'healthcare'
  | 'animal_welfare'
  | 'arts_culture'
  | 'economic_empowerment';

export interface VirtueImpactData {
  cause: VirtueCause;
  causeName: string;
  icon: string;
  description: string;
  virtueImpactId: string;
}

export const VIRTUE_CAUSES: Record<VirtueCause, VirtueImpactData> = {
  education: {
    cause: 'education',
    causeName: 'Education & Learning',
    icon: '📚',
    description: 'Empower minds through education, literacy, and lifelong learning opportunities.',
    virtueImpactId: 'education',
  },
  environment: {
    cause: 'environment',
    causeName: 'Environmental Protection',
    icon: '🌍',
    description: 'Protect our planet through conservation, sustainability, and climate action.',
    virtueImpactId: 'environment',
  },
  healthcare: {
    cause: 'healthcare',
    causeName: 'Health & Wellness',
    icon: '❤️',
    description: 'Support physical and mental health initiatives that save and improve lives.',
    virtueImpactId: 'healthcare',
  },
  animal_welfare: {
    cause: 'animal_welfare',
    causeName: 'Animal Welfare',
    icon: '🐾',
    description: 'Protect and care for animals through rescue, conservation, and advocacy.',
    virtueImpactId: 'animal_welfare',
  },
  arts_culture: {
    cause: 'arts_culture',
    causeName: 'Arts & Culture',
    icon: '🎨',
    description: 'Celebrate and preserve arts, culture, and creative expression worldwide.',
    virtueImpactId: 'arts_culture',
  },
  economic_empowerment: {
    cause: 'economic_empowerment',
    causeName: 'Economic Empowerment',
    icon: '💼',
    description: 'Create opportunities for financial independence and economic growth.',
    virtueImpactId: 'economic_empowerment',
  },
};
