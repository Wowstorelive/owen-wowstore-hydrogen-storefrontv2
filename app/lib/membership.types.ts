/**
 * WowStore Membership Types
 * Shared types and constants that can be used by both client and server
 */

export type MembershipTier = 'free' | 'silver' | 'gold' | 'platinum';

export interface MembershipBenefits {
  tier: MembershipTier;
  price: number;
  features: {
    voiceAI: boolean;
    shopTheLook: boolean;
    eMagazine: boolean;
    socialIntegration: boolean;
    aiCreativeDirector: boolean;
    yourStoryFeature: boolean;
    communityImpactTracker: boolean;
    earlyAccess: boolean;
    personalStyling: boolean;
    exclusiveDeals: boolean;
    prioritySupport: boolean;
    virtualTryOn: boolean;
    virtualCloset: boolean;
    unlimitedStyleQuizzes: boolean;
  };
  limits: {
    voiceSessionsPerMonth: number;
    shopTheLookUpdates: string;
    eMagazineIssues: string;
    weeklyHighlights: number;
    socialAccountsConnected: number;
    stylingSessionsPerMonth: number;
  };
  socialFeatures: {
    description: string;
    highlights: string[];
  };
}

export const MEMBERSHIP_TIERS: Record<MembershipTier, MembershipBenefits> = {
  free: {
    tier: 'free',
    price: 0,
    features: {
      voiceAI: true,
      shopTheLook: false,
      eMagazine: false,
      socialIntegration: false,
      aiCreativeDirector: false,
      yourStoryFeature: false,
      communityImpactTracker: true,
      earlyAccess: false,
      personalStyling: false,
      exclusiveDeals: false,
      prioritySupport: false,
      virtualTryOn: false,
      virtualCloset: false,
      unlimitedStyleQuizzes: false,
    },
    limits: {
      voiceSessionsPerMonth: 10,
      shopTheLookUpdates: 'None',
      eMagazineIssues: 'None',
      weeklyHighlights: 0,
      socialAccountsConnected: 0,
      stylingSessionsPerMonth: 0,
    },
    socialFeatures: {
      description: 'Track your impact in the change maker community',
      highlights: [
        'See community total impact',
        'Track your personal donations',
        'Join the change maker movement',
      ],
    },
  },
  silver: {
    tier: 'silver',
    price: 9.99,
    features: {
      voiceAI: true,
      shopTheLook: true,
      eMagazine: false,
      socialIntegration: true,
      aiCreativeDirector: false,
      yourStoryFeature: true,
      communityImpactTracker: true,
      earlyAccess: true,
      personalStyling: false,
      exclusiveDeals: true,
      prioritySupport: false,
      virtualTryOn: false,
      virtualCloset: false,
      unlimitedStyleQuizzes: true,
    },
    limits: {
      voiceSessionsPerMonth: 50,
      shopTheLookUpdates: 'Weekly',
      eMagazineIssues: 'None',
      weeklyHighlights: 1,
      socialAccountsConnected: 2,
      stylingSessionsPerMonth: 0,
    },
    socialFeatures: {
      description: 'Connect your social life & track your change maker story',
      highlights: [
        'Connect 2 social accounts (Instagram, TikTok)',
        'Share 1 life highlight per week',
        'Build your change maker story',
        'Track your personal impact journey',
      ],
    },
  },
  gold: {
    tier: 'gold',
    price: 29.99,
    features: {
      voiceAI: true,
      shopTheLook: true,
      eMagazine: true,
      socialIntegration: true,
      aiCreativeDirector: true,
      yourStoryFeature: true,
      communityImpactTracker: true,
      earlyAccess: true,
      personalStyling: true,
      exclusiveDeals: true,
      prioritySupport: true,
      virtualTryOn: true,
      virtualCloset: false,
      unlimitedStyleQuizzes: true,
    },
    limits: {
      voiceSessionsPerMonth: 200,
      shopTheLookUpdates: 'Daily',
      eMagazineIssues: 'Monthly',
      weeklyHighlights: 3,
      socialAccountsConnected: 4,
      stylingSessionsPerMonth: 1,
    },
    socialFeatures: {
      description: 'AI Creative Director curates your life story in your personalized e-magazine',
      highlights: [
        'Connect all 4 social platforms (Instagram, Facebook, TikTok, Pinterest)',
        'AI Creative Director selects your 3 best moments each week',
        'Monthly personalized e-magazine with YOUR story',
        'See your style evolution & impact journey',
        'Your own chapter: "The Story In The Making"',
        'Share your change maker influence with the community',
      ],
    },
  },
  platinum: {
    tier: 'platinum',
    price: 99.99,
    features: {
      voiceAI: true,
      shopTheLook: true,
      eMagazine: true,
      socialIntegration: true,
      aiCreativeDirector: true,
      yourStoryFeature: true,
      communityImpactTracker: true,
      earlyAccess: true,
      personalStyling: true,
      exclusiveDeals: true,
      prioritySupport: true,
      virtualTryOn: true,
      virtualCloset: true,
      unlimitedStyleQuizzes: true,
    },
    limits: {
      voiceSessionsPerMonth: -1, // Unlimited
      shopTheLookUpdates: 'Daily + Personalized',
      eMagazineIssues: 'Weekly',
      weeklyHighlights: -1, // Unlimited
      socialAccountsConnected: -1, // All platforms
      stylingSessionsPerMonth: 4,
    },
    socialFeatures: {
      description: 'Your complete life story, curated weekly by AI Creative Director - the ultimate change maker experience',
      highlights: [
        'Connect unlimited social accounts across all platforms',
        'AI Creative Director curates unlimited weekly highlights',
        'WEEKLY personalized e-magazine with your evolving story',
        'Full style evolution timeline with AI insights',
        'Real-time impact dashboard showing lives you\'ve changed',
        'Community leadership: Inspire other change makers',
        'Featured in WowStore community as top change maker',
        'Your story published & shared as inspiration',
        'Exclusive access to change maker events & meetups',
      ],
    },
  },
};
