/**
 * WowStore QR Code, Sharing & Rewards Service
 *
 * Create your wow moments. Share with your tribe. Earn rewards.
 */

import {getFirestore} from './firebase.server';
import {getVertexAI} from './vertex-ai.server';
import QRCode from 'qrcode';

export type ShareableContent =
  | 'product'
  | 'blog'
  | 'my_story'
  | 'my_impact'
  | 'outfit'
  | 'magazine'
  | 'wow_moment';

export interface QRCodeOptions {
  contentType: ShareableContent;
  contentId: string;
  customerId?: string;
  campaign?: string;
  metadata?: Record<string, any>;
}

export interface ShareReward {
  points: number;
  description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface TribeMember {
  memberId: string;
  name: string;
  joinedAt: string;
  totalPurchases: number;
  referralCode: string;
  status: 'active' | 'inactive';
}

export interface WowMoment {
  id: string;
  customerId: string;
  type: 'purchase' | 'milestone' | 'share' | 'referral' | 'impact' | 'custom';
  title: string;
  description: string;
  imageUrl?: string;
  shareUrl: string;
  qrCodeUrl: string;
  createdAt: string;
  shares: number;
  views: number;
  conversions: number;
}

/**
 * Generate QR code for shareable content
 */
export async function generateQRCode(
  options: QRCodeOptions
): Promise<{qrCodeDataUrl: string; shareUrl: string}> {
  const {contentType, contentId, customerId, campaign, metadata} = options;

  // Generate tracking URL with UTM parameters
  const baseUrl = process.env.PUBLIC_STORE_DOMAIN || 'https://wowstore.live';
  const trackingId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  let shareUrl = '';

  switch (contentType) {
    case 'product':
      shareUrl = `${baseUrl}/products/${contentId}`;
      break;
    case 'blog':
      shareUrl = `${baseUrl}/blogs/${contentId}`;
      break;
    case 'my_story':
      shareUrl = `${baseUrl}/stories/${customerId}`;
      break;
    case 'my_impact':
      shareUrl = `${baseUrl}/impact/${customerId}`;
      break;
    case 'outfit':
      shareUrl = `${baseUrl}/outfits/${contentId}`;
      break;
    case 'magazine':
      shareUrl = `${baseUrl}/magazine/${customerId}/${contentId}`;
      break;
    case 'wow_moment':
      shareUrl = `${baseUrl}/wow/${contentId}`;
      break;
  }

  // Add tracking parameters
  const utmParams = new URLSearchParams({
    utm_source: 'qr_code',
    utm_medium: 'share',
    utm_campaign: campaign || 'user_share',
    utm_content: contentType,
    ref: customerId || 'organic',
    tid: trackingId,
  });

  shareUrl = `${shareUrl}?${utmParams.toString()}`;

  // Generate QR code
  const qrCodeDataUrl = await QRCode.toDataURL(shareUrl, {
    width: 512,
    margin: 2,
    color: {
      dark: '#667eea',
      light: '#ffffff',
    },
  });

  // Track QR code generation
  if (customerId) {
    await trackQRCodeGeneration(customerId, contentType, trackingId, metadata);
  }

  return {qrCodeDataUrl, shareUrl};
}

/**
 * Create a "Wow Moment" - shareable highlight of user achievement
 */
export async function createWowMoment(
  customerId: string,
  momentData: {
    type: WowMoment['type'];
    title?: string;
    description?: string;
    imageUrl?: string;
    metadata?: Record<string, any>;
  }
): Promise<WowMoment> {
  try {
    const firestore = getFirestore();

    // AI generates title/description if not provided
    let {title, description} = momentData;

    if (!title || !description) {
      const aiGenerated = await generateWowMomentContent(
        customerId,
        momentData.type,
        momentData.metadata
      );
      title = title || aiGenerated.title;
      description = description || aiGenerated.description;
    }

    // Create wow moment
    const momentId = `wow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const {qrCodeDataUrl, shareUrl} = await generateQRCode({
      contentType: 'wow_moment',
      contentId: momentId,
      customerId,
      campaign: 'wow_moments',
      metadata: momentData.metadata,
    });

    const wowMoment: WowMoment = {
      id: momentId,
      customerId,
      type: momentData.type,
      title,
      description,
      imageUrl: momentData.imageUrl,
      shareUrl,
      qrCodeUrl: qrCodeDataUrl,
      createdAt: new Date().toISOString(),
      shares: 0,
      views: 0,
      conversions: 0,
    };

    await firestore.collection('wow_moments').doc(momentId).set(wowMoment);

    // Award points for creating wow moment
    await awardSharePoints(customerId, 'create_wow_moment');

    return wowMoment;
  } catch (error) {
    console.error('Error creating wow moment:', error);
    throw new Error('Failed to create wow moment');
  }
}

/**
 * Share content and earn rewards
 */
export async function shareContent(
  customerId: string,
  contentType: ShareableContent,
  contentId: string,
  platform: 'instagram' | 'facebook' | 'tiktok' | 'twitter' | 'whatsapp' | 'email'
): Promise<{shareUrl: string; pointsEarned: number}> {
  try {
    const firestore = getFirestore();

    // Generate shareable link with tracking
    const {qrCodeDataUrl, shareUrl} = await generateQRCode({
      contentType,
      contentId,
      customerId,
      campaign: `share_${platform}`,
    });

    // Track share
    await firestore.collection('shares').add({
      customerId,
      contentType,
      contentId,
      platform,
      shareUrl,
      createdAt: new Date().toISOString(),
    });

    // Award points
    const points = await awardSharePoints(customerId, `share_${platform}`);

    return {shareUrl, pointsEarned: points};
  } catch (error) {
    console.error('Error sharing content:', error);
    throw new Error('Failed to share content');
  }
}

/**
 * Get user's tribe (referrals)
 */
export async function getUserTribe(customerId: string): Promise<{
  members: TribeMember[];
  totalReferrals: number;
  totalRewards: number;
  referralCode: string;
}> {
  try {
    const firestore = getFirestore();

    // Get or create referral code
    const referralCode = await getOrCreateReferralCode(customerId);

    // Get tribe members
    const snapshot = await firestore
      .collection('referrals')
      .where('referrerId', '==', customerId)
      .get();

    const members: TribeMember[] = [];
    let totalRewards = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      members.push({
        memberId: data.referredCustomerId,
        name: data.referredCustomerName || 'New Member',
        joinedAt: data.createdAt,
        totalPurchases: data.totalPurchases || 0,
        referralCode: data.referralCode,
        status: data.status || 'active',
      });

      // Calculate rewards
      totalRewards += data.rewardsPaid || 0;
    }

    return {
      members,
      totalReferrals: members.length,
      totalRewards,
      referralCode,
    };
  } catch (error) {
    console.error('Error fetching user tribe:', error);
    return {
      members: [],
      totalReferrals: 0,
      totalRewards: 0,
      referralCode: await getOrCreateReferralCode(customerId),
    };
  }
}

/**
 * Track referral conversion
 */
export async function trackReferral(
  referralCode: string,
  newCustomerId: string,
  newCustomerEmail: string
): Promise<void> {
  try {
    const firestore = getFirestore();

    // Find referrer by code
    const referrerDoc = await firestore
      .collection('referral_codes')
      .where('code', '==', referralCode)
      .limit(1)
      .get();

    if (referrerDoc.empty) {
      console.log('Invalid referral code');
      return;
    }

    const referrerId = referrerDoc.docs[0].data().customerId;

    // Create referral record
    await firestore.collection('referrals').add({
      referrerId,
      referredCustomerId: newCustomerId,
      referredCustomerEmail: newCustomerEmail,
      referralCode,
      createdAt: new Date().toISOString(),
      status: 'active',
      totalPurchases: 0,
      rewardsPaid: 0,
    });

    // Award points to referrer
    await awardSharePoints(referrerId, 'referral_signup');

    // Create wow moment for referrer
    await createWowMoment(referrerId, {
      type: 'referral',
      metadata: {referredEmail: newCustomerEmail},
    });
  } catch (error) {
    console.error('Error tracking referral:', error);
  }
}

/**
 * Award points for share actions
 */
async function awardSharePoints(
  customerId: string,
  action: string
): Promise<number> {
  const POINT_VALUES: Record<string, number> = {
    create_wow_moment: 10,
    share_instagram: 5,
    share_facebook: 5,
    share_tiktok: 10,
    share_twitter: 5,
    share_whatsapp: 3,
    share_email: 3,
    referral_signup: 50,
    referral_purchase: 100,
    share_magazine: 15,
    share_impact: 20,
  };

  const points = POINT_VALUES[action] || 0;

  if (points > 0) {
    try {
      const firestore = getFirestore();
      const pointsRef = firestore.collection('reward_points').doc(customerId);

      const doc = await pointsRef.get();
      const currentPoints = doc.exists ? doc.data()?.totalPoints || 0 : 0;

      await pointsRef.set(
        {
          customerId,
          totalPoints: currentPoints + points,
          lastUpdated: new Date().toISOString(),
          transactions: firestore.FieldValue.arrayUnion({
            action,
            points,
            timestamp: new Date().toISOString(),
          }),
        },
        {merge: true}
      );
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  }

  return points;
}

/**
 * Get reward points balance
 */
export async function getRewardPoints(customerId: string): Promise<{
  totalPoints: number;
  redeemableValue: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  nextTierPoints: number;
}> {
  try {
    const firestore = getFirestore();
    const doc = await firestore
      .collection('reward_points')
      .doc(customerId)
      .get();

    const totalPoints = doc.exists ? doc.data()?.totalPoints || 0 : 0;

    // Calculate tier
    let tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    let nextTierPoints: number;

    if (totalPoints >= 5000) {
      tier = 'platinum';
      nextTierPoints = 0;
    } else if (totalPoints >= 2000) {
      tier = 'gold';
      nextTierPoints = 5000 - totalPoints;
    } else if (totalPoints >= 500) {
      tier = 'silver';
      nextTierPoints = 2000 - totalPoints;
    } else {
      tier = 'bronze';
      nextTierPoints = 500 - totalPoints;
    }

    // 100 points = $1
    const redeemableValue = totalPoints / 100;

    return {totalPoints, redeemableValue, tier, nextTierPoints};
  } catch (error) {
    console.error('Error fetching reward points:', error);
    return {totalPoints: 0, redeemableValue: 0, tier: 'bronze', nextTierPoints: 500};
  }
}

/**
 * Generate AI content for wow moment
 */
async function generateWowMomentContent(
  customerId: string,
  type: WowMoment['type'],
  metadata?: Record<string, any>
): Promise<{title: string; description: string}> {
  try {
    const vertexAI = getVertexAI();
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
    });

    const prompt = `You are WowStore's AI Creative Director. Create a compelling "Wow Moment" title and description for a user's achievement.

Moment Type: ${type}
Context: ${JSON.stringify(metadata || {})}

Guidelines:
- Title: 5-8 words, exciting, personal, inspiring
- Description: 15-25 words, celebrate the achievement, encourage sharing
- Tone: Authentic, encouraging, celebratory
- Focus: Impact, style, community

Respond in JSON format:
{
  "title": "Your Achievement Title Here",
  "description": "Your description here that celebrates and inspires."
}`;

    const result = await model.generateContent(prompt);
    const response = JSON.parse(result.response.text());

    return {
      title: response.title || 'Amazing Wow Moment!',
      description: response.description || 'Share your achievement with your tribe!',
    };
  } catch (error) {
    console.error('Error generating wow moment content:', error);
    return {
      title: 'Amazing Wow Moment!',
      description: 'Share your achievement with your tribe!',
    };
  }
}

/**
 * Get or create referral code
 */
async function getOrCreateReferralCode(customerId: string): Promise<string> {
  try {
    const firestore = getFirestore();
    const doc = await firestore
      .collection('referral_codes')
      .where('customerId', '==', customerId)
      .limit(1)
      .get();

    if (!doc.empty) {
      return doc.docs[0].data().code;
    }

    // Generate unique referral code
    const code = `WOW${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

    await firestore.collection('referral_codes').add({
      customerId,
      code,
      createdAt: new Date().toISOString(),
      uses: 0,
    });

    return code;
  } catch (error) {
    console.error('Error creating referral code:', error);
    return 'WOWSTORE';
  }
}

/**
 * Track QR code generation
 */
async function trackQRCodeGeneration(
  customerId: string,
  contentType: ShareableContent,
  trackingId: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const firestore = getFirestore();
    await firestore.collection('qr_codes').add({
      customerId,
      contentType,
      trackingId,
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
      scans: 0,
    });
  } catch (error) {
    console.error('Error tracking QR code generation:', error);
  }
}

/**
 * Track QR code scan
 */
export async function trackQRCodeScan(
  trackingId: string,
  scannerInfo?: {
    userAgent?: string;
    ip?: string;
    referrer?: string;
  }
): Promise<void> {
  try {
    const firestore = getFirestore();

    // Find QR code
    const snapshot = await firestore
      .collection('qr_codes')
      .where('trackingId', '==', trackingId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return;
    }

    const qrCodeDoc = snapshot.docs[0];
    const qrCodeData = qrCodeDoc.data();

    // Increment scan count
    await qrCodeDoc.ref.update({
      scans: (qrCodeData.scans || 0) + 1,
      lastScannedAt: new Date().toISOString(),
    });

    // Track scan event
    await firestore.collection('qr_scans').add({
      qrCodeId: qrCodeDoc.id,
      customerId: qrCodeData.customerId,
      contentType: qrCodeData.contentType,
      trackingId,
      scannerInfo: scannerInfo || {},
      scannedAt: new Date().toISOString(),
    });

    // Award points to sharer
    await awardSharePoints(qrCodeData.customerId, 'qr_scan');
  } catch (error) {
    console.error('Error tracking QR code scan:', error);
  }
}

/**
 * Get user's wow moments
 */
export async function getUserWowMoments(customerId: string): Promise<WowMoment[]> {
  try {
    const firestore = getFirestore();
    const snapshot = await firestore
      .collection('wow_moments')
      .where('customerId', '==', customerId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map((doc) => doc.data() as WowMoment);
  } catch (error) {
    console.error('Error fetching wow moments:', error);
    return [];
  }
}
