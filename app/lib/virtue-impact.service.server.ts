/**
 * WowStore x Virtue Impact Integration
 *
 * virtueimpact.com/subscriptions already integrated on Shopify
 * 5% of every purchase goes to user-chosen cause
 * Track impact across 6 virtues
 */

import {getFirestore} from './firebase.server';
import {type VirtueCause, type VirtueImpactData, VIRTUE_CAUSES} from './virtue-impact.types';

/**
 * Get user's selected virtue cause
 */
export async function getUserVirtueCause(
  customerId: string
): Promise<VirtueCause | null> {
  try {
    const firestore = getFirestore();
    const doc = await firestore
      .collection('customer_virtue_preferences')
      .doc(customerId)
      .get();

    if (doc.exists) {
      return (doc.data()?.selectedCause as VirtueCause) || null;
    }

    return null;
  } catch (error) {
    console.error('Error fetching virtue cause:', error);
    return null;
  }
}

/**
 * Set user's virtue cause preference
 */
export async function setUserVirtueCause(
  customerId: string,
  cause: VirtueCause
): Promise<void> {
  try {
    const firestore = getFirestore();
    await firestore
      .collection('customer_virtue_preferences')
      .doc(customerId)
      .set(
        {
          customerId,
          selectedCause: cause,
          causeName: VIRTUE_CAUSES[cause].causeName,
          updatedAt: new Date().toISOString(),
        },
        {merge: true}
      );
  } catch (error) {
    console.error('Error setting virtue cause:', error);
    throw new Error('Failed to save virtue cause preference');
  }
}

/**
 * Calculate 5% donation amount from order
 */
export function calculateVirtueDonation(orderTotal: number): number {
  return Math.round(orderTotal * 0.05 * 100) / 100; // 5% rounded to 2 decimals
}

/**
 * Track virtue impact donation (after Shopify checkout)
 * This is called after Virtue Impact Shopify integration processes the donation
 */
export async function trackVirtueDonation(
  customerId: string,
  orderData: {
    orderId: string;
    orderNumber: string;
    totalAmount: number;
    donationAmount: number;
    cause: VirtueCause;
    virtueImpactTransactionId?: string;
  }
): Promise<void> {
  try {
    const firestore = getFirestore();

    // Store donation record
    await firestore.collection('virtue_donations').add({
      customerId,
      orderId: orderData.orderId,
      orderNumber: orderData.orderNumber,
      totalAmount: orderData.totalAmount,
      donationAmount: orderData.donationAmount,
      cause: orderData.cause,
      causeName: VIRTUE_CAUSES[orderData.cause].causeName,
      virtueImpactTransactionId: orderData.virtueImpactTransactionId,
      createdAt: new Date().toISOString(),
      status: 'completed',
    });

    // Update user's total impact
    const impactRef = firestore.collection('customer_impact').doc(customerId);
    const impactDoc = await impactRef.get();

    if (impactDoc.exists) {
      const currentData = impactDoc.data();
      await impactRef.update({
        totalDonated: (currentData?.totalDonated || 0) + orderData.donationAmount,
        totalOrders: (currentData?.totalOrders || 0) + 1,
        causesSupported: Array.from(
          new Set([...(currentData?.causesSupported || []), orderData.cause])
        ),
        lastDonationAt: new Date().toISOString(),
      });
    } else {
      await impactRef.set({
        customerId,
        totalDonated: orderData.donationAmount,
        totalOrders: 1,
        causesSupported: [orderData.cause],
        lastDonationAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }

    console.log(
      `Virtue donation tracked: $${orderData.donationAmount} to ${orderData.cause}`
    );
  } catch (error) {
    console.error('Error tracking virtue donation:', error);
  }
}

/**
 * Get user's total virtue impact
 */
export async function getUserVirtueImpact(customerId: string): Promise<{
  totalDonated: number;
  totalOrders: number;
  causesSupported: VirtueCause[];
  livesImpacted: number;
  recentDonations: Array<{
    orderNumber: string;
    amount: number;
    cause: string;
    date: string;
  }>;
}> {
  try {
    const firestore = getFirestore();

    // Get total impact
    const impactDoc = await firestore
      .collection('customer_impact')
      .doc(customerId)
      .get();

    const impactData = impactDoc.exists ? impactDoc.data() : null;
    const totalDonated = impactData?.totalDonated || 0;
    const totalOrders = impactData?.totalOrders || 0;
    const causesSupported = impactData?.causesSupported || [];

    // Calculate lives impacted ($50 = 1 life)
    const livesImpacted = Math.floor(totalDonated / 50);

    // Get recent donations
    const donationsSnapshot = await firestore
      .collection('virtue_donations')
      .where('customerId', '==', customerId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const recentDonations = donationsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        orderNumber: data.orderNumber,
        amount: data.donationAmount,
        cause: data.causeName,
        date: data.createdAt,
      };
    });

    return {
      totalDonated,
      totalOrders,
      causesSupported,
      livesImpacted,
      recentDonations,
    };
  } catch (error) {
    console.error('Error fetching user virtue impact:', error);
    return {
      totalDonated: 0,
      totalOrders: 0,
      causesSupported: [],
      livesImpacted: 0,
      recentDonations: [],
    };
  }
}

/**
 * Get community virtue impact (aggregated)
 */
export async function getCommunityVirtueImpact(): Promise<{
  totalDonated: number;
  totalDonors: number;
  livesImpacted: number;
  causeBreakdown: Record<VirtueCause, {amount: number; percentage: number}>;
}> {
  try {
    const firestore = getFirestore();

    // Get all customer impact
    const impactSnapshot = await firestore.collection('customer_impact').get();

    let totalDonated = 0;
    const causeAmounts: Record<VirtueCause, number> = {
      education: 0,
      environment: 0,
      healthcare: 0,
      animal_welfare: 0,
      arts_culture: 0,
      economic_empowerment: 0,
    };

    impactSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      totalDonated += data.totalDonated || 0;
    });

    // Get cause breakdown
    const donationsSnapshot = await firestore.collection('virtue_donations').get();

    donationsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const cause = data.cause as VirtueCause;
      if (causeAmounts[cause] !== undefined) {
        causeAmounts[cause] += data.donationAmount || 0;
      }
    });

    // Calculate percentages
    const causeBreakdown: Record<VirtueCause, {amount: number; percentage: number}> = {
      education: {
        amount: causeAmounts.education,
        percentage: totalDonated > 0 ? (causeAmounts.education / totalDonated) * 100 : 0,
      },
      environment: {
        amount: causeAmounts.environment,
        percentage: totalDonated > 0 ? (causeAmounts.environment / totalDonated) * 100 : 0,
      },
      healthcare: {
        amount: causeAmounts.healthcare,
        percentage: totalDonated > 0 ? (causeAmounts.healthcare / totalDonated) * 100 : 0,
      },
      animal_welfare: {
        amount: causeAmounts.animal_welfare,
        percentage: totalDonated > 0 ? (causeAmounts.animal_welfare / totalDonated) * 100 : 0,
      },
      arts_culture: {
        amount: causeAmounts.arts_culture,
        percentage: totalDonated > 0 ? (causeAmounts.arts_culture / totalDonated) * 100 : 0,
      },
      economic_empowerment: {
        amount: causeAmounts.economic_empowerment,
        percentage: totalDonated > 0 ? (causeAmounts.economic_empowerment / totalDonated) * 100 : 0,
      },
    };

    return {
      totalDonated,
      totalDonors: impactSnapshot.size,
      livesImpacted: Math.floor(totalDonated / 50),
      causeBreakdown,
    };
  } catch (error) {
    console.error('Error fetching community virtue impact:', error);
    return {
      totalDonated: 0,
      totalDonors: 0,
      livesImpacted: 0,
      causeBreakdown: {
        education: {amount: 0, percentage: 0},
        environment: {amount: 0, percentage: 0},
        healthcare: {amount: 0, percentage: 0},
        animal_welfare: {amount: 0, percentage: 0},
        arts_culture: {amount: 0, percentage: 0},
        economic_empowerment: {amount: 0, percentage: 0},
      },
    };
  }
}

/**
 * Generate virtue impact badge (for sharing)
 */
export async function generateVirtueImpactBadge(
  customerId: string
): Promise<{
  imageUrl: string;
  text: string;
  shareUrl: string;
}> {
  const impact = await getUserVirtueImpact(customerId);

  // Generate badge text
  const text = `I've donated $${impact.totalDonated.toFixed(2)} and impacted ${impact.livesImpacted} ${impact.livesImpacted === 1 ? 'life' : 'lives'} through WowStore! Join me in making a difference. #WowStore #ChangeMaker`;

  // Badge image URL (to be generated with Canvas/Sharp)
  const imageUrl = `https://wowstore.live/api/virtue/badge/${customerId}`;

  // Share URL
  const shareUrl = `https://wowstore.live/impact/${customerId}`;

  return {imageUrl, text, shareUrl};
}

/**
 * Shopify webhook handler: Process order with Virtue Impact
 * This should be called from Shopify webhooks after order is created
 */
export async function processVirtueImpactFromOrder(orderData: {
  orderId: string;
  orderNumber: string;
  customerId: string;
  totalPrice: number;
  lineItems: any[];
}): Promise<void> {
  try {
    // Get customer's virtue cause preference
    const selectedCause = await getUserVirtueCause(orderData.customerId);

    if (!selectedCause) {
      console.log('No virtue cause selected by customer, skipping donation');
      return;
    }

    // Calculate 5% donation
    const donationAmount = calculateVirtueDonation(orderData.totalPrice);

    // Virtue Impact Shopify integration should handle the actual donation
    // We just track it in our system
    await trackVirtueDonation(orderData.customerId, {
      orderId: orderData.orderId,
      orderNumber: orderData.orderNumber,
      totalAmount: orderData.totalPrice,
      donationAmount,
      cause: selectedCause,
    });

    console.log(`Order ${orderData.orderNumber}: $${donationAmount} to ${selectedCause}`);
  } catch (error) {
    console.error('Error processing virtue impact from order:', error);
  }
}
