/**
 * WowStore Visual Intelligence System
 *
 * - Visual Search: Upload photo → Find products
 * - Virtual Try-On: See products on yourself (3D/AR)
 * - Virtual Closet: Organize your items
 * - AI Styling: Get outfit/space/lifestyle advice
 * - Live Wow Moments: Create content with virtual try-on
 */

import {getVertexAI} from './vertex-ai.server';
import {getFirestore} from './firebase.server';
import {Storage} from '@google-cloud/storage';
import {createWowMoment, generateQRCode} from './qr-share-rewards.service.server';
import {getUserStory} from './social-integration.service.server';

const storage = new Storage();

export type ProductCategory = 'fashion' | 'gadgets' | 'home' | 'selfcare';

export type SearchIntent =
  | 'find_product'
  | 'style_advice'
  | 'space_design'
  | 'outfit_complete'
  | 'similar_items'
  | 'occasion_recommendations';

export interface VisualSearchResult {
  intent: SearchIntent;
  products: Array<{
    productId: string;
    title: string;
    handle: string;
    imageUrl: string;
    price: number;
    category: ProductCategory;
    matchScore: number;
    reason: string;
  }>;
  aiAdvice?: {
    summary: string;
    suggestions: string[];
    styleProfile?: string;
    occasion?: string;
  };
  stylingTips?: string[];
}

export interface VirtualClosetItem {
  id: string;
  customerId: string;
  productId?: string;
  title: string;
  category: ProductCategory;
  imageUrl: string;
  purchasedFrom: 'wowstore' | 'other';
  color?: string;
  brand?: string;
  size?: string;
  season?: string[];
  occasions?: string[];
  tags?: string[];
  wornCount: number;
  lastWorn?: string;
  addedAt: string;
}

export interface VirtualTryOnRequest {
  userPhotoUrl: string;
  productImageUrl: string;
  productCategory: ProductCategory;
  customerId: string;
}

export interface VirtualTryOnResult {
  tryOnImageUrl: string;
  confidence: number;
  sharingQRCode: string;
  wowMomentReady: boolean;
}

export interface AIStyleAdvice {
  occasion: string;
  recommendations: Array<{
    type: 'product' | 'closet_item' | 'combination';
    items: string[];
    reason: string;
    imageUrl?: string;
  }>;
  colorPalette: string[];
  styleProfile: string;
  tips: string[];
}

/**
 * Visual Search: Upload photo, find products or get styling advice
 */
export async function visualSearch(
  imageUrl: string,
  context: {
    customerId?: string;
    intent?: SearchIntent;
    category?: ProductCategory;
    occasion?: string;
  }
): Promise<VisualSearchResult> {
  try {
    const vertexAI = getVertexAI();
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-pro-vision',
    });

    // Download image for analysis
    const imageBuffer = await downloadImage(imageUrl);
    const imageBase64 = imageBuffer.toString('base64');

    const prompt = `You are WowStore's AI Visual Intelligence System. Analyze this image and help the user.

Context:
- Category preference: ${context.category || 'any'}
- Occasion: ${context.occasion || 'any'}
- Intent: ${context.intent || 'find_product'}

Task: Analyze the image and determine:
1. What is the user looking for? (product, style advice, space design, outfit completion, etc.)
2. Identify key visual elements (colors, style, patterns, mood, items)
3. Recommend relevant products from WowStore (fashion, gadgets, home, self-care)
4. Provide styling/design advice

Respond in JSON format:
{
  "intent": "find_product" | "style_advice" | "space_design" | "outfit_complete" | "similar_items" | "occasion_recommendations",
  "visualAnalysis": {
    "primaryColors": ["color1", "color2"],
    "style": "modern" | "boho" | "minimalist" | "eclectic" | "luxury" | "casual",
    "mood": "elegant" | "playful" | "professional" | "relaxed",
    "detectedItems": ["item1", "item2"],
    "occasion": "work" | "casual" | "evening" | "athletic" | "home"
  },
  "recommendations": [
    {
      "searchQuery": "product search term",
      "category": "fashion" | "gadgets" | "home" | "selfcare",
      "reason": "why this matches"
    }
  ],
  "aiAdvice": {
    "summary": "Brief analysis of image and user needs",
    "suggestions": ["tip1", "tip2", "tip3"],
    "styleProfile": "Description of detected style",
    "occasion": "Best suited occasion"
  },
  "stylingTips": ["tip1", "tip2", "tip3"]
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64,
        },
      },
    ]);

    const response = JSON.parse(result.response.text());

    // Search for products based on recommendations
    const products = await searchProductsFromRecommendations(
      response.recommendations,
      context.customerId
    );

    return {
      intent: response.intent,
      products,
      aiAdvice: response.aiAdvice,
      stylingTips: response.stylingTips,
    };
  } catch (error) {
    console.error('Error in visual search:', error);
    throw new Error('Visual search failed');
  }
}

/**
 * Virtual Try-On: See product on yourself using AR/AI
 */
export async function virtualTryOn(
  request: VirtualTryOnRequest
): Promise<VirtualTryOnResult> {
  try {
    const vertexAI = getVertexAI();
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-pro-vision',
    });

    // Download images
    const userImageBuffer = await downloadImage(request.userPhotoUrl);
    const productImageBuffer = await downloadImage(request.productImageUrl);

    const prompt = `You are WowStore's Virtual Try-On AI. Create a realistic visualization of how this ${request.productCategory} product would look on the user.

Instructions:
1. Analyze user's body type, skin tone, style
2. Analyze product style, colors, fit
3. Provide detailed guidance for visualization
4. Rate confidence (0-100) in how well it matches

Respond in JSON:
{
  "visualizationGuide": "Detailed description of how product would look on user",
  "confidence": 85,
  "fitAnalysis": "How well the product fits user's style and body type",
  "colorMatch": "How well colors complement user",
  "styleCompatibility": "How well it matches user's existing style",
  "recommendations": ["suggestion1", "suggestion2"],
  "alternativeProducts": ["If this doesn't match well, suggest alternatives"]
}`;

    const result = await model.generateContent([
      prompt,
      'User Photo:',
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: userImageBuffer.toString('base64'),
        },
      },
      'Product Photo:',
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: productImageBuffer.toString('base64'),
        },
      },
    ]);

    const response = JSON.parse(result.response.text());

    // In production, use actual AR/3D rendering service (e.g., Google AR, Three.js)
    // For now, return visualization guide
    const tryOnImageUrl = await generateTryOnVisualization(
      request.userPhotoUrl,
      request.productImageUrl,
      response.visualizationGuide
    );

    // Generate QR code for sharing
    const {qrCodeDataUrl} = await generateQRCode({
      contentType: 'wow_moment',
      contentId: `tryon-${Date.now()}`,
      customerId: request.customerId,
      campaign: 'virtual_tryon',
    });

    return {
      tryOnImageUrl,
      confidence: response.confidence,
      sharingQRCode: qrCodeDataUrl,
      wowMomentReady: response.confidence > 70,
    };
  } catch (error) {
    console.error('Error in virtual try-on:', error);
    throw new Error('Virtual try-on failed');
  }
}

/**
 * Add item to virtual closet
 */
export async function addToVirtualCloset(
  customerId: string,
  item: Omit<VirtualClosetItem, 'id' | 'customerId' | 'wornCount' | 'addedAt'>
): Promise<VirtualClosetItem> {
  try {
    const firestore = getFirestore();

    // AI analyzes item for automatic tagging
    const aiTags = await analyzeItemForTags(item.imageUrl, item.category);

    const closetItem: VirtualClosetItem = {
      id: `closet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      customerId,
      ...item,
      color: item.color || aiTags.color,
      season: item.season || aiTags.season,
      occasions: item.occasions || aiTags.occasions,
      tags: [...(item.tags || []), ...aiTags.additionalTags],
      wornCount: 0,
      addedAt: new Date().toISOString(),
    };

    await firestore
      .collection('virtual_closet')
      .doc(closetItem.id)
      .set(closetItem);

    return closetItem;
  } catch (error) {
    console.error('Error adding to virtual closet:', error);
    throw new Error('Failed to add to closet');
  }
}

/**
 * Get virtual closet items
 */
export async function getVirtualCloset(
  customerId: string,
  filters?: {
    category?: ProductCategory;
    occasion?: string;
    season?: string;
    color?: string;
  }
): Promise<VirtualClosetItem[]> {
  try {
    const firestore = getFirestore();
    let query = firestore
      .collection('virtual_closet')
      .where('customerId', '==', customerId);

    if (filters?.category) {
      query = query.where('category', '==', filters.category);
    }

    if (filters?.occasion) {
      query = query.where('occasions', 'array-contains', filters.occasion);
    }

    if (filters?.season) {
      query = query.where('season', 'array-contains', filters.season);
    }

    const snapshot = await query.get();

    let items = snapshot.docs.map((doc) => doc.data() as VirtualClosetItem);

    // Client-side filtering for color (Firestore doesn't support this well)
    if (filters?.color) {
      items = items.filter((item) =>
        item.color?.toLowerCase().includes(filters.color!.toLowerCase())
      );
    }

    return items;
  } catch (error) {
    console.error('Error fetching virtual closet:', error);
    return [];
  }
}

/**
 * Get AI styling advice for specific moment
 */
export async function getAIStyleAdvice(
  customerId: string,
  request: {
    occasion: string;
    mood?: string;
    weather?: string;
    imageUrl?: string;
    preferences?: string[];
  }
): Promise<AIStyleAdvice> {
  try {
    const vertexAI = getVertexAI();
    const model = vertexAI.getGenerativeModel({
      model: request.imageUrl ? 'gemini-1.5-pro-vision' : 'gemini-1.5-pro',
    });

    // Get user's closet and style profile
    const closetItems = await getVirtualCloset(customerId);
    const userStory = await getUserStory(customerId);

    const prompt = `You are WowStore's AI Personal Stylist. Help the user look their best for this moment.

User Context:
- Occasion: ${request.occasion}
- Mood: ${request.mood || 'confident and authentic'}
- Weather: ${request.weather || 'mild'}
- Preferences: ${request.preferences?.join(', ') || 'none specified'}
- Style Profile: ${userStory?.styleEvolution.currentStyle.join(', ') || 'discovering their style'}

Virtual Closet (${closetItems.length} items):
${closetItems.slice(0, 20).map((item) => `- ${item.title} (${item.category})`).join('\n')}

Task:
1. Suggest outfit combinations from their closet
2. Recommend products from WowStore to complete the look
3. Provide styling tips
4. Consider the occasion, mood, weather

${request.imageUrl ? 'ALSO: Analyze the provided image for additional context.' : ''}

Respond in JSON:
{
  "occasion": "${request.occasion}",
  "recommendations": [
    {
      "type": "closet_item" | "product" | "combination",
      "items": ["item1", "item2"],
      "reason": "Why this works for the occasion",
      "imageUrl": null
    }
  ],
  "colorPalette": ["color1", "color2", "color3"],
  "styleProfile": "Description of suggested style for this moment",
  "tips": [
    "Styling tip 1",
    "Styling tip 2",
    "Styling tip 3"
  ]
}`;

    let result;
    if (request.imageUrl) {
      const imageBuffer = await downloadImage(request.imageUrl);
      result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBuffer.toString('base64'),
          },
        },
      ]);
    } else {
      result = await model.generateContent(prompt);
    }

    const response = JSON.parse(result.response.text());
    return response;
  } catch (error) {
    console.error('Error getting AI style advice:', error);
    throw new Error('AI styling advice failed');
  }
}

/**
 * Create live wow moment with virtual try-on
 */
export async function createLiveWowMoment(
  customerId: string,
  data: {
    userPhotoUrl: string;
    productIds: string[];
    occasion: string;
    caption?: string;
  }
): Promise<{
  wowMomentId: string;
  compositeImageUrl: string;
  qrCodeUrl: string;
  shareUrl: string;
  points: number;
}> {
  try {
    // Generate composite image with all products virtually tried on
    const compositeImageUrl = await generateMultiProductVisualization(
      data.userPhotoUrl,
      data.productIds
    );

    // AI generates caption if not provided
    let caption = data.caption;
    if (!caption) {
      const vertexAI = getVertexAI();
      const model = vertexAI.getGenerativeModel({model: 'gemini-1.5-pro'});

      const result = await model.generateContent(
        `Create an inspiring caption for a wow moment where someone is virtually trying on products for "${data.occasion}". 15-25 words. Authentic, exciting, shareable.`
      );
      caption = result.response.text().trim();
    }

    // Create wow moment
    const wowMoment = await createWowMoment(customerId, {
      type: 'custom',
      title: `My ${data.occasion} Look`,
      description: caption,
      imageUrl: compositeImageUrl,
      metadata: {
        productIds: data.productIds,
        occasion: data.occasion,
        virtualTryOn: true,
      },
    });

    // Award extra points for virtual try-on wow moment
    await awardSharePoints(customerId, 'create_virtual_tryon_moment');

    return {
      wowMomentId: wowMoment.id,
      compositeImageUrl,
      qrCodeUrl: wowMoment.qrCodeUrl,
      shareUrl: wowMoment.shareUrl,
      points: 15, // Extra points for virtual try-on
    };
  } catch (error) {
    console.error('Error creating live wow moment:', error);
    throw new Error('Failed to create wow moment');
  }
}

/**
 * Space Design Advice: Upload room photo, get design recommendations
 */
export async function getSpaceDesignAdvice(
  imageUrl: string,
  context: {
    roomType: 'bedroom' | 'living_room' | 'kitchen' | 'bathroom' | 'office' | 'other';
    style?: string;
    budget?: 'low' | 'medium' | 'high';
  }
): Promise<{
  analysis: string;
  recommendations: Array<{
    productType: string;
    reason: string;
    placement: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  colorScheme: string[];
  styleAdvice: string[];
  shoppingList: Array<{searchQuery: string; category: ProductCategory}>;
}> {
  try {
    const vertexAI = getVertexAI();
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-pro-vision',
    });

    const imageBuffer = await downloadImage(imageUrl);

    const prompt = `You are WowStore's Interior Design AI. Analyze this ${context.roomType} and provide design advice.

Context:
- Room Type: ${context.roomType}
- Desired Style: ${context.style || 'modern comfortable'}
- Budget: ${context.budget || 'medium'}

Task:
1. Analyze current space (colors, layout, lighting, furniture)
2. Identify opportunities for improvement
3. Recommend products from WowStore (home decor, gadgets, self-care)
4. Provide actionable design tips

Respond in JSON:
{
  "analysis": "Current state of the space and opportunities",
  "recommendations": [
    {
      "productType": "specific product type",
      "reason": "why this would improve the space",
      "placement": "where to place it",
      "priority": "high" | "medium" | "low"
    }
  ],
  "colorScheme": ["color1", "color2", "color3"],
  "styleAdvice": ["tip1", "tip2", "tip3"],
  "shoppingList": [
    {"searchQuery": "product to search for", "category": "home"}
  ]
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBuffer.toString('base64'),
        },
      },
    ]);

    const response = JSON.parse(result.response.text());
    return response;
  } catch (error) {
    console.error('Error getting space design advice:', error);
    throw new Error('Space design advice failed');
  }
}

/**
 * Helper: Download image from URL
 */
async function downloadImage(imageUrl: string): Promise<Buffer> {
  // If it's a GCS URL, download from bucket
  if (imageUrl.startsWith('gs://') || imageUrl.includes('storage.googleapis.com')) {
    const bucket = storage.bucket(process.env.GCS_BUCKET || 'wowstore-media');
    const fileName = imageUrl.split('/').pop() || 'image.jpg';
    const file = bucket.file(fileName);
    const [buffer] = await file.download();
    return buffer;
  }

  // Otherwise, fetch from HTTP URL
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Helper: Analyze item for automatic tagging
 */
async function analyzeItemForTags(
  imageUrl: string,
  category: ProductCategory
): Promise<{
  color: string;
  season: string[];
  occasions: string[];
  additionalTags: string[];
}> {
  try {
    const vertexAI = getVertexAI();
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-pro-vision',
    });

    const imageBuffer = await downloadImage(imageUrl);

    const prompt = `Analyze this ${category} item and provide tags.

Respond in JSON:
{
  "color": "primary color name",
  "season": ["spring", "summer", "fall", "winter"],
  "occasions": ["casual", "work", "evening", "athletic"],
  "additionalTags": ["tag1", "tag2", "tag3"]
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBuffer.toString('base64'),
        },
      },
    ]);

    return JSON.parse(result.response.text());
  } catch (error) {
    console.error('Error analyzing item tags:', error);
    return {
      color: 'unknown',
      season: ['all'],
      occasions: ['casual'],
      additionalTags: [],
    };
  }
}

/**
 * Helper: Search products from AI recommendations
 */
async function searchProductsFromRecommendations(
  recommendations: Array<{searchQuery: string; category: ProductCategory; reason: string}>,
  customerId?: string
): Promise<VisualSearchResult['products']> {
  // In production, query Shopify API for products
  // For now, return mock data
  return recommendations.map((rec, i) => ({
    productId: `product-${i}`,
    title: rec.searchQuery,
    handle: rec.searchQuery.toLowerCase().replace(/\s+/g, '-'),
    imageUrl: 'https://placeholder.com/300',
    price: 49.99,
    category: rec.category,
    matchScore: 0.85,
    reason: rec.reason,
  }));
}

/**
 * Helper: Generate try-on visualization
 * In production, use AR service like Google AR, Snap AR, or Three.js
 */
async function generateTryOnVisualization(
  userPhotoUrl: string,
  productImageUrl: string,
  guide: string
): Promise<string> {
  // TODO: Integrate actual AR/3D rendering service
  // For now, return composite concept
  return `${userPhotoUrl}?tryon=${encodeURIComponent(productImageUrl)}`;
}

/**
 * Helper: Generate multi-product visualization
 */
async function generateMultiProductVisualization(
  userPhotoUrl: string,
  productIds: string[]
): Promise<string> {
  // TODO: Composite multiple products onto user photo
  return `${userPhotoUrl}?products=${productIds.join(',')}`;
}
