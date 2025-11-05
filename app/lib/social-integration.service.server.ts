/**
 * WowStore Social Integration Service
 *
 * Connect your social life to your e-magazine
 * AI Creative Director curates your story
 * Show your impact as a change maker
 */

import {getFirestore} from './firebase.server';
import {getVertexAI} from './vertex-ai.server';

export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok' | 'pinterest';

export interface SocialConnection {
  platform: SocialPlatform;
  connected: boolean;
  username?: string;
  connectedAt?: string;
  lastSyncedAt?: string;
  profilePictureUrl?: string;
}

export interface LifeHighlight {
  id: string;
  type: 'photo' | 'milestone' | 'impact' | 'style_moment';
  imageUrl?: string;
  caption: string;
  source: SocialPlatform | 'wowstore' | 'manual';
  createdAt: string;
  aiGenerated: boolean;
  likes?: number;
  featured: boolean;
}

export interface UserStory {
  customerId: string;
  storyTitle: string;
  currentChapter: string;
  weeklyHighlights: LifeHighlight[];
  impactStats: {
    totalDonated: number;
    causesSupported: string[];
    livesImpacted: number;
    carbonSaved: number;
  };
  styleEvolution: {
    startDate: string;
    currentStyle: string[];
    favoriteProducts: string[];
    outfitsCreated: number;
  };
  communityEngagement: {
    followersInspired: number;
    stylingTipsShared: number;
    challengesCompleted: string[];
    badgesEarned: string[];
  };
}

/**
 * Connect social media account
 */
export async function connectSocialAccount(
  customerId: string,
  platform: SocialPlatform,
  accessToken: string,
  username: string
): Promise<void> {
  try {
    const firestore = getFirestore();
    await firestore
      .collection('social_connections')
      .doc(`${customerId}_${platform}`)
      .set({
        customerId,
        platform,
        connected: true,
        username,
        accessToken, // Encrypt in production
        connectedAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
      });
  } catch (error) {
    console.error('Error connecting social account:', error);
    throw new Error('Failed to connect social account');
  }
}

/**
 * Get connected social accounts
 */
export async function getSocialConnections(
  customerId: string
): Promise<SocialConnection[]> {
  try {
    const firestore = getFirestore();
    const snapshot = await firestore
      .collection('social_connections')
      .where('customerId', '==', customerId)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        platform: data.platform,
        connected: data.connected,
        username: data.username,
        connectedAt: data.connectedAt,
        lastSyncedAt: data.lastSyncedAt,
        profilePictureUrl: data.profilePictureUrl,
      };
    });
  } catch (error) {
    console.error('Error fetching social connections:', error);
    return [];
  }
}

/**
 * AI Creative Director: Curate weekly highlights
 * Selects 3 best moments from user's week
 */
export async function curateWeeklyHighlights(
  customerId: string
): Promise<LifeHighlight[]> {
  try {
    const firestore = getFirestore();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get all potential highlights from the past week
    const snapshot = await firestore
      .collection('life_highlights')
      .where('customerId', '==', customerId)
      .where('createdAt', '>=', oneWeekAgo.toISOString())
      .orderBy('createdAt', 'desc')
      .get();

    const allHighlights = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as LifeHighlight[];

    if (allHighlights.length === 0) {
      return [];
    }

    // AI Creative Director selects the best 3 moments
    const vertexAI = getVertexAI();
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
    });

    const prompt = `You are WowStore's AI Creative Director. Select the 3 most impactful and visually compelling moments from this user's week to feature in their personalized e-magazine.

Moments available:
${allHighlights.map((h, i) => `${i + 1}. ${h.type}: ${h.caption} (${h.source})`).join('\n')}

Criteria:
- Visual appeal
- Emotional impact
- Story continuity
- Diversity (mix of style, impact, and life moments)
- Authenticity

Respond with ONLY the numbers (1-${allHighlights.length}) of the 3 selected moments, comma-separated.
Example: 2,5,7`;

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    const selectedIndices = response
      .split(',')
      .map((n) => parseInt(n.trim()) - 1)
      .filter((i) => !isNaN(i) && i >= 0 && i < allHighlights.length)
      .slice(0, 3);

    const selectedHighlights = selectedIndices.map((i) => allHighlights[i]);

    // Mark as featured
    for (const highlight of selectedHighlights) {
      await firestore
        .collection('life_highlights')
        .doc(highlight.id)
        .update({featured: true, featuredAt: new Date().toISOString()});
    }

    return selectedHighlights;
  } catch (error) {
    console.error('Error curating weekly highlights:', error);
    return [];
  }
}

/**
 * Add a life highlight (manual or automated)
 */
export async function addLifeHighlight(
  customerId: string,
  highlight: Omit<LifeHighlight, 'id' | 'createdAt'>
): Promise<string> {
  try {
    const firestore = getFirestore();
    const docRef = await firestore.collection('life_highlights').add({
      customerId,
      ...highlight,
      createdAt: new Date().toISOString(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error adding life highlight:', error);
    throw new Error('Failed to add highlight');
  }
}

/**
 * Track purchase impact and create highlight
 */
export async function trackPurchaseImpact(
  customerId: string,
  orderData: {
    orderId: string;
    totalAmount: number;
    charityDonation: number;
    charityCause: string;
    products: Array<{title: string; imageUrl: string}>;
  }
): Promise<void> {
  try {
    const firestore = getFirestore();

    // Update impact stats
    const userStoryRef = firestore.collection('user_stories').doc(customerId);
    const userStoryDoc = await userStoryRef.get();

    if (userStoryDoc.exists) {
      const currentStats = userStoryDoc.data()?.impactStats || {};
      await userStoryRef.update({
        'impactStats.totalDonated':
          (currentStats.totalDonated || 0) + orderData.charityDonation,
        'impactStats.causesSupported': [
          ...(currentStats.causesSupported || []),
          orderData.charityCause,
        ],
        'impactStats.livesImpacted': calculateLivesImpacted(
          (currentStats.totalDonated || 0) + orderData.charityDonation
        ),
      });
    } else {
      await userStoryRef.set({
        customerId,
        storyTitle: 'My Change Maker Journey',
        currentChapter: 'Beginning My Impact Story',
        impactStats: {
          totalDonated: orderData.charityDonation,
          causesSupported: [orderData.charityCause],
          livesImpacted: calculateLivesImpacted(orderData.charityDonation),
          carbonSaved: 0,
        },
        styleEvolution: {
          startDate: new Date().toISOString(),
          currentStyle: [],
          favoriteProducts: [],
          outfitsCreated: 0,
        },
        communityEngagement: {
          followersInspired: 0,
          stylingTipsShared: 0,
          challengesCompleted: [],
          badgesEarned: [],
        },
      });
    }

    // Create impact highlight
    await addLifeHighlight(customerId, {
      type: 'impact',
      imageUrl: orderData.products[0]?.imageUrl,
      caption: `Made a difference! $${orderData.charityDonation.toFixed(2)} donated to ${orderData.charityCause}. Every purchase creates change.`,
      source: 'wowstore',
      aiGenerated: false,
      featured: false,
    });
  } catch (error) {
    console.error('Error tracking purchase impact:', error);
  }
}

/**
 * Generate personalized story chapter with AI
 */
export async function generateStoryChapter(
  customerId: string
): Promise<string> {
  try {
    const firestore = getFirestore();
    const userStoryDoc = await firestore
      .collection('user_stories')
      .doc(customerId)
      .get();

    if (!userStoryDoc.exists) {
      return 'Your Change Maker Journey Begins Today';
    }

    const story = userStoryDoc.data() as UserStory;
    const vertexAI = getVertexAI();
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
    });

    const prompt = `You are WowStore's AI Creative Director writing a personalized story chapter title for a change maker.

User's Impact Journey:
- Total Donated: $${story.impactStats.totalDonated.toFixed(2)}
- Causes Supported: ${story.impactStats.causesSupported.join(', ')}
- Lives Impacted: ${story.impactStats.livesImpacted}
- Style Evolution: ${story.styleEvolution.currentStyle.join(', ')}
- Outfits Created: ${story.styleEvolution.outfitsCreated}
- Community Engagement: ${story.communityEngagement.followersInspired} followers inspired

Write ONE compelling, poetic chapter title (5-8 words) that captures their current phase of transformation.
Make it personal, inspiring, and authentic. No quotes or punctuation at the end.

Examples:
- "Finding My Voice Through Fashion Activism"
- "Style Meets Purpose In Every Choice"
- "Building A Legacy One Outfit At A Time"`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim().replace(/['"]/g, '');
  } catch (error) {
    console.error('Error generating story chapter:', error);
    return 'My Change Maker Journey';
  }
}

/**
 * Get user's complete story
 */
export async function getUserStory(customerId: string): Promise<UserStory | null> {
  try {
    const firestore = getFirestore();
    const doc = await firestore.collection('user_stories').doc(customerId).get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as UserStory;
  } catch (error) {
    console.error('Error fetching user story:', error);
    return null;
  }
}

/**
 * Get community impact stats (aggregated)
 */
export async function getCommunityImpactStats(): Promise<{
  totalDonated: number;
  totalMembers: number;
  livesImpacted: number;
  causesSupported: string[];
  topChangemakers: Array<{name: string; impact: number}>;
}> {
  try {
    const firestore = getFirestore();
    const snapshot = await firestore.collection('user_stories').get();

    let totalDonated = 0;
    const causesSet = new Set<string>();

    snapshot.docs.forEach((doc) => {
      const story = doc.data() as UserStory;
      totalDonated += story.impactStats.totalDonated || 0;
      story.impactStats.causesSupported.forEach((cause) => causesSet.add(cause));
    });

    return {
      totalDonated,
      totalMembers: snapshot.size,
      livesImpacted: calculateLivesImpacted(totalDonated),
      causesSupported: Array.from(causesSet),
      topChangemakers: [], // TODO: Implement leaderboard
    };
  } catch (error) {
    console.error('Error fetching community impact:', error);
    return {
      totalDonated: 0,
      totalMembers: 0,
      livesImpacted: 0,
      causesSupported: [],
      topChangemakers: [],
    };
  }
}

/**
 * Calculate estimated lives impacted from donation amount
 * Based on charity efficiency ratios
 */
function calculateLivesImpacted(donationAmount: number): number {
  // Average: $50 donation = 1 life significantly impacted
  return Math.floor(donationAmount / 50);
}

/**
 * Sync social media highlights (called by cron job)
 */
export async function syncSocialHighlights(customerId: string): Promise<void> {
  // TODO: Implement OAuth integrations for Instagram, Facebook, TikTok, Pinterest
  // For beta: Manual photo uploads only
  console.log(`Syncing social highlights for ${customerId}`);
}

/**
 * Generate AI caption for photo
 */
export async function generatePhotoCaption(
  imageUrl: string,
  context?: string
): Promise<string> {
  try {
    const vertexAI = getVertexAI();
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-pro-vision',
    });

    const prompt = `You are WowStore's AI Creative Director. Write a compelling, authentic caption for this photo that will appear in the user's personalized e-magazine.

Context: ${context || 'User shared this style moment'}

Write ONE caption (15-25 words) that is:
- Personal and authentic
- Celebrates style and purpose
- Connects to their change maker journey
- Inspiring but not cheesy

No hashtags. No emojis. Just genuine storytelling.`;

    // Note: In production, fetch and pass the actual image
    // For now, use text-only model
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Error generating photo caption:', error);
    return 'Another beautiful moment in my change maker journey.';
  }
}
