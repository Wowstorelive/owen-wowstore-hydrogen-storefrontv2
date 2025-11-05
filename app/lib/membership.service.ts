/**
 * WowStore Membership Service
 *
 * Beta: All users are FREE tier
 * Grand Opening: Unlock Silver, Gold, Platinum tiers
 */

import {getFirestore} from './firebase.server';

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

/**
 * Get membership tier for a customer
 *
 * During beta: Everyone is FREE
 * After grand opening: Check Shopify customer metafields or tags
 */
export async function getMembershipTier(
  customerId?: string
): Promise<MembershipTier> {
  // Beta mode: Everyone is free
  const betaMode = process.env.BETA_MODE === 'true';
  if (betaMode || !customerId) {
    return 'free';
  }

  try {
    const firestore = getFirestore();
    const membershipDoc = await firestore
      .collection('memberships')
      .doc(customerId)
      .get();

    if (membershipDoc.exists) {
      const data = membershipDoc.data();
      return (data?.tier as MembershipTier) || 'free';
    }

    return 'free';
  } catch (error) {
    console.error('Error fetching membership tier:', error);
    return 'free';
  }
}

/**
 * Get membership benefits for a tier
 */
export function getMembershipBenefits(
  tier: MembershipTier
): MembershipBenefits {
  return MEMBERSHIP_TIERS[tier];
}

/**
 * Check if user has access to a feature
 */
export function hasFeatureAccess(
  tier: MembershipTier,
  feature: keyof MembershipBenefits['features']
): boolean {
  return MEMBERSHIP_TIERS[tier].features[feature];
}

/**
 * Add email to founding member waitlist
 */
export async function addToFoundingMemberWaitlist(
  email: string,
  name?: string,
  interestedTier?: MembershipTier
): Promise<void> {
  try {
    const firestore = getFirestore();
    await firestore.collection('founding_member_waitlist').add({
      email,
      name: name || null,
      interestedTier: interestedTier || 'silver',
      signedUpAt: new Date().toISOString(),
      status: 'pending',
      betaTester: true,
    });
  } catch (error) {
    console.error('Error adding to waitlist:', error);
    throw new Error('Failed to join waitlist');
  }
}

/**
 * Get membership stats for a customer
 */
export async function getMembershipStats(customerId: string): Promise<{
  tier: MembershipTier;
  voiceSessionsUsed: number;
  voiceSessionsLimit: number;
  memberSince: string;
  benefits: MembershipBenefits;
}> {
  const tier = await getMembershipTier(customerId);
  const benefits = getMembershipBenefits(tier);

  try {
    const firestore = getFirestore();
    const membershipDoc = await firestore
      .collection('memberships')
      .doc(customerId)
      .get();

    const data = membershipDoc.data();
    const voiceSessionsUsed = data?.voiceSessionsUsed || 0;
    const memberSince = data?.createdAt || new Date().toISOString();

    return {
      tier,
      voiceSessionsUsed,
      voiceSessionsLimit: benefits.limits.voiceSessionsPerMonth,
      memberSince,
      benefits,
    };
  } catch (error) {
    console.error('Error fetching membership stats:', error);
    return {
      tier,
      voiceSessionsUsed: 0,
      voiceSessionsLimit: benefits.limits.voiceSessionsPerMonth,
      memberSince: new Date().toISOString(),
      benefits,
    };
  }
}

/**
 * Track voice session usage
 */
export async function trackVoiceSessionUsage(customerId: string): Promise<void> {
  try {
    const firestore = getFirestore();
    const membershipRef = firestore.collection('memberships').doc(customerId);

    const doc = await membershipRef.get();
    if (doc.exists) {
      await membershipRef.update({
        voiceSessionsUsed: (doc.data()?.voiceSessionsUsed || 0) + 1,
        lastVoiceSessionAt: new Date().toISOString(),
      });
    } else {
      await membershipRef.set({
        tier: 'free',
        voiceSessionsUsed: 1,
        lastVoiceSessionAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error tracking voice session usage:', error);
  }
}

/**
 * Check if user can use voice AI (within limits)
 */
export async function canUseVoiceAI(customerId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const stats = await getMembershipStats(customerId);

  if (stats.voiceSessionsLimit === -1) {
    return { allowed: true }; // Unlimited
  }

  if (stats.voiceSessionsUsed >= stats.voiceSessionsLimit) {
    return {
      allowed: false,
      reason: `Voice session limit reached (${stats.voiceSessionsLimit}/month). Upgrade to continue.`,
    };
  }

  return { allowed: true };
}
