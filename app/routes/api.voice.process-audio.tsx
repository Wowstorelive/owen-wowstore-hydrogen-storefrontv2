/**
 * API Route: Process Audio
 * POST /api/voice/process-audio
 * Transcribes audio, generates AI response, and tracks session
 */

import {json, type ActionFunctionArgs} from '@shopify/remix-oxygen';
import {transcribeAudio} from '~/lib/voice-ai/speech-to-text.service.server';
import {generateAssistantResponse} from '~/lib/voice-ai/vertex-assistant.service.server';
import {
  getVoiceSession,
  addMessageToSession,
  updateSessionContext,
  trackProductDiscussion,
  trackConversionAttempt,
} from '~/lib/voice-ai/voice-session.service.server';
import {triggerWebhook} from '~/lib/webhooks';

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({error: 'Method not allowed'}, {status: 405});
  }

  try {
    // Parse multipart form data (audio + metadata)
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const sessionId = formData.get('sessionId') as string;
    const languageCode = formData.get('language') as string;

    if (!audioFile || !sessionId) {
      return json({error: 'Missing audio or sessionId'}, {status: 400});
    }

    // Get session
    const session = await getVoiceSession(sessionId);
    if (!session) {
      return json({error: 'Session not found'}, {status: 404});
    }

    // Convert audio file to buffer
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    // Step 1: Transcribe audio to text
    const transcription = await transcribeAudio(audioBuffer, {
      languageCode: languageCode || session.language,
      encoding: 'WEBM_OPUS',
      model: 'command_and_search',
    });

    if (!transcription.transcript) {
      return json({error: 'Could not transcribe audio'}, {status: 400});
    }

    // Step 2: Add user message to session
    await addMessageToSession(sessionId, {
      role: 'user',
      content: transcription.transcript,
      timestamp: new Date().toISOString(),
    });

    // Step 3: Get current context (cart, products, etc.)
    const assistantContext = await buildAssistantContext(session, context);

    // Step 4: Generate AI response
    const aiResponse = await generateAssistantResponse(
      transcription.transcript,
      assistantContext
    );

    // Step 5: Add assistant message to session
    await addMessageToSession(
      sessionId,
      {
        role: 'assistant',
        content: aiResponse.text,
        timestamp: new Date().toISOString(),
      },
      aiResponse.intent
    );

    // Step 6: Execute suggested actions
    await processSuggestedActions(sessionId, aiResponse.suggestedActions || [], context);

    // Step 7: Track analytics
    if (aiResponse.intent === 'add_to_cart' || aiResponse.intent === 'checkout') {
      await trackConversionAttempt(sessionId);
    }

    // Step 8: Trigger n8n webhook for voice interaction
    try {
      await triggerWebhook(
        process.env.N8N_WEBHOOK_VOICE_INTERACTION || '',
        {
          sessionId,
          customerId: session.customerId,
          userInput: transcription.transcript,
          aiResponse: aiResponse.text,
          intent: aiResponse.intent,
          timestamp: new Date().toISOString(),
        }
      );
    } catch (webhookError) {
      console.warn('n8n webhook failed:', webhookError);
    }

    return json({
      success: true,
      transcription: {
        text: transcription.transcript,
        confidence: transcription.confidence,
      },
      response: {
        text: aiResponse.text,
        intent: aiResponse.intent,
        actions: aiResponse.suggestedActions,
      },
      tokensUsed: aiResponse.tokensUsed,
    });
  } catch (error) {
    console.error('Error processing audio:', error);
    return json(
      {
        error: 'Failed to process audio',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      {status: 500}
    );
  }
}

/**
 * Build assistant context from session and Shopify data
 */
async function buildAssistantContext(session: any, context: any) {
  const assistantContext: any = {
    customerId: session.customerId,
    language: session.language,
    conversationHistory: session.conversationHistory,
    funnelStage: session.context.funnelStage,
  };

  // Get customer cart if logged in
  if (session.customerId) {
    try {
      const {data} = await context.customerAccount.query(
        `query getCart {
          customer {
            firstName
            cart {
              lines(first: 50) {
                nodes {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      product {
                        id
                        title
                      }
                      price {
                        amount
                      }
                    }
                  }
                }
              }
            }
          }
        }`
      );

      if (data?.customer) {
        assistantContext.customerName = data.customer.firstName;
        assistantContext.cartItems = data.customer.cart?.lines.nodes.map((line: any) => ({
          productId: line.merchandise.product.id,
          productTitle: line.merchandise.product.title,
          quantity: line.quantity,
          price: line.merchandise.price.amount,
        }));
      }
    } catch (error) {
      console.warn('Could not fetch cart:', error);
    }
  }

  return assistantContext;
}

/**
 * Process suggested actions from AI
 */
async function processSuggestedActions(
  sessionId: string,
  actions: Array<{type: string; data: any}>,
  context: any
) {
  for (const action of actions) {
    switch (action.type) {
      case 'add_to_cart':
        // Track product discussion
        if (action.data.productId) {
          await trackProductDiscussion(sessionId, action.data.productId);
        }
        break;

      case 'search_products':
        // Could trigger product search and update session context
        break;

      case 'navigate_funnel':
        // Update funnel stage in session
        await updateSessionContext(sessionId, {
          funnelStage: action.data.stage,
        });
        break;
    }
  }
}
