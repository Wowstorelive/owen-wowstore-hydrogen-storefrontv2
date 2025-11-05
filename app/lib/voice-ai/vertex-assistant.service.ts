/**
 * Vertex AI Shopping Assistant Service
 * Intelligent AI assistant for voice-based shopping interactions
 * Integrates with Shopify, Firestore, and AI-powered funnel
 */

import {VertexAI, GenerativeModel} from '@google-cloud/vertexai';

const PROJECT_ID = 'wowstore-ai-media-agent';
const LOCATION = 'europe-west4';

let vertexAI: VertexAI | null = null;
let model: GenerativeModel | null = null;

function getVertexAI(): VertexAI {
  if (!vertexAI) {
    vertexAI = new VertexAI({
      project: PROJECT_ID,
      location: LOCATION,
    });
  }
  return vertexAI;
}

function getModel(): GenerativeModel {
  if (!model) {
    const vertex = getVertexAI();
    model = vertex.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
        topP: 0.9,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
      ],
    });
  }
  return model;
}

export interface AssistantContext {
  customerId?: string;
  customerName?: string;
  language?: string;
  conversationHistory?: ConversationMessage[];
  currentProducts?: ProductContext[];
  cartItems?: CartContext[];
  funnelStage?: string;
  userPreferences?: Record<string, any>;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ProductContext {
  id: string;
  title: string;
  price: string;
  available: boolean;
  tags?: string[];
}

export interface CartContext {
  productId: string;
  productTitle: string;
  quantity: number;
  price: string;
}

export interface AssistantResponse {
  text: string;
  intent: 'product_search' | 'add_to_cart' | 'checkout' | 'general_help' | 'funnel_navigation' | 'order_status' | 'unknown';
  confidence: number;
  suggestedActions?: Array<{type: string; data: any}>;
  tokensUsed?: number;
}

/**
 * System prompt for WowStore shopping assistant
 */
function buildSystemPrompt(context: AssistantContext): string {
  const customerGreeting = context.customerName
    ? `You're helping ${context.customerName}, a valued customer`
    : "You're helping a customer";

  return `You are a professional shopping assistant for WowStore, a premium e-commerce platform.

${customerGreeting}. Your role is to:
1. Help customers find products they'll love
2. Answer questions about products, shipping, and orders
3. Guide them through the shopping funnel
4. Provide personalized recommendations
5. Make the shopping experience delightful and efficient

IMPORTANT GUIDELINES:
- Keep responses concise (2-3 sentences max for voice)
- Be friendly, professional, and helpful
- Always confirm before adding items to cart
- Suggest relevant products when appropriate
- Use natural, conversational language
- If you don't know something, be honest and offer to help differently

${context.language ? `Respond in ${context.language}` : 'Respond in English'}

Current context:
- Customer: ${context.customerName || 'Guest'}
- Cart items: ${context.cartItems?.length || 0}
${context.funnelStage ? `- Funnel stage: ${context.funnelStage}` : ''}
${context.currentProducts?.length ? `- Currently viewing: ${context.currentProducts.map(p => p.title).join(', ')}` : ''}`;
}

/**
 * Generate AI response for voice interaction
 */
export async function generateAssistantResponse(
  userInput: string,
  context: AssistantContext = {}
): Promise<AssistantResponse> {
  const model = getModel();
  const systemPrompt = buildSystemPrompt(context);

  // Build conversation history
  const chatHistory = context.conversationHistory || [];
  const messages = [
    ...chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{text: msg.content}],
    })),
    {
      role: 'user',
      parts: [{text: userInput}],
    },
  ];

  try {
    const chat = model.startChat({
      history: messages.slice(0, -1),
      systemInstruction: systemPrompt,
    });

    const result = await chat.sendMessage(userInput);
    const response = result.response;
    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Analyze intent from the response and user input
    const intent = detectIntent(userInput, responseText);
    const suggestedActions = extractActions(responseText, intent, context);

    return {
      text: responseText,
      intent,
      confidence: 0.85, // Gemini doesn't provide confidence scores
      suggestedActions,
      tokensUsed: response.usageMetadata?.totalTokenCount,
    };
  } catch (error) {
    console.error('Vertex AI error:', error);
    return {
      text: "I'm having trouble processing that right now. Could you try asking in a different way?",
      intent: 'unknown',
      confidence: 0,
    };
  }
}

/**
 * Detect user intent from input and response
 */
function detectIntent(
  userInput: string,
  responseText: string
): AssistantResponse['intent'] {
  const input = userInput.toLowerCase();
  const response = responseText.toLowerCase();

  // Product search patterns
  if (input.match(/\b(find|search|looking for|show me|need)\b/) &&
      input.match(/\b(product|item|clothing|shoe|dress|shirt)\b/)) {
    return 'product_search';
  }

  // Add to cart patterns
  if (input.match(/\b(add|put|place)\b/) && input.match(/\b(cart|bag|basket)\b/)) {
    return 'add_to_cart';
  }

  // Checkout patterns
  if (input.match(/\b(checkout|buy|purchase|pay|order)\b/)) {
    return 'checkout';
  }

  // Order status patterns
  if (input.match(/\b(order|tracking|delivery|shipping|status)\b/) &&
      input.match(/\b(where|when|track|status)\b/)) {
    return 'order_status';
  }

  // Funnel navigation
  if (input.match(/\b(next|continue|proceed|back)\b/) ||
      response.match(/\b(step|stage|funnel)\b/)) {
    return 'funnel_navigation';
  }

  // Default to general help
  return 'general_help';
}

/**
 * Extract actionable items from AI response
 */
function extractActions(
  responseText: string,
  intent: AssistantResponse['intent'],
  context: AssistantContext
): Array<{type: string; data: any}> {
  const actions: Array<{type: string; data: any}> = [];

  switch (intent) {
    case 'product_search':
      // Extract potential search terms
      const searchMatch = responseText.match(/search(?:ing)? for ["']([^"']+)["']/i);
      if (searchMatch) {
        actions.push({
          type: 'search_products',
          data: {query: searchMatch[1]},
        });
      }
      break;

    case 'add_to_cart':
      // If there are current products, suggest adding the first one
      if (context.currentProducts?.length) {
        actions.push({
          type: 'add_to_cart',
          data: {productId: context.currentProducts[0].id},
        });
      }
      break;

    case 'checkout':
      actions.push({
        type: 'navigate_to_checkout',
        data: {},
      });
      break;

    case 'funnel_navigation':
      actions.push({
        type: 'navigate_funnel',
        data: {direction: 'next'},
      });
      break;

    case 'order_status':
      actions.push({
        type: 'show_orders',
        data: {customerId: context.customerId},
      });
      break;
  }

  return actions;
}

/**
 * Generate product recommendation using AI
 */
export async function generateProductRecommendations(
  customerPreferences: {
    style?: string;
    priceRange?: string;
    previousPurchases?: string[];
    browsingHistory?: string[];
  },
  maxRecommendations: number = 5
): Promise<{recommendations: string[]; reasoning: string}> {
  const model = getModel();

  const prompt = `Based on this customer profile:
- Style preferences: ${customerPreferences.style || 'Not specified'}
- Price range: ${customerPreferences.priceRange || 'Not specified'}
- Previous purchases: ${customerPreferences.previousPurchases?.join(', ') || 'None'}
- Recently viewed: ${customerPreferences.browsingHistory?.join(', ') || 'None'}

Suggest ${maxRecommendations} product types or categories that would be perfect for this customer.
Format your response as a JSON object with "recommendations" array and "reasoning" string.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Try to parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      recommendations: [],
      reasoning: 'Unable to generate recommendations',
    };
  } catch (error) {
    console.error('Recommendation error:', error);
    return {
      recommendations: [],
      reasoning: 'Error generating recommendations',
    };
  }
}

/**
 * Summarize a conversation for storage or analysis
 */
export async function summarizeConversation(
  conversationHistory: ConversationMessage[]
): Promise<{summary: string; keyTopics: string[]; outcome: string}> {
  const model = getModel();

  const conversationText = conversationHistory
    .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n');

  const prompt = `Analyze this customer service conversation and provide:
1. A brief summary (1-2 sentences)
2. Key topics discussed
3. The outcome (what the customer wanted and whether it was resolved)

Conversation:
${conversationText}

Format as JSON with keys: summary, keyTopics (array), outcome`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      summary: 'Conversation summary unavailable',
      keyTopics: [],
      outcome: 'Unknown',
    };
  } catch (error) {
    console.error('Summarization error:', error);
    return {
      summary: 'Error summarizing conversation',
      keyTopics: [],
      outcome: 'Unknown',
    };
  }
}
