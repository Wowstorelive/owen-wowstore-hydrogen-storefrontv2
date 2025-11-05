/**
 * WowStore Membership Service
 *
 * Beta: All users are FREE tier
 * Grand Opening: Unlock Silver, Gold, Platinum tiers
 */

import {getFirestore} from './firebase.server';
import {
  MEMBERSHIP_TIERS,
  type MembershipTier,
  type MembershipBenefits,
} from './membership.types';

// Re-export types for backwards compatibility
export type {MembershipTier, MembershipBenefits};
export {MEMBERSHIP_TIERS};

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
