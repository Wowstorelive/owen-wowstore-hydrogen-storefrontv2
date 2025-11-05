/**
 * API Route: End Voice Session
 * POST /api/voice/end-session
 * Ends a voice session and tracks analytics
 */

import {json, type ActionFunctionArgs} from '@shopify/remix-oxygen';
import {
  endVoiceSession,
  getVoiceSession,
} from '~/lib/voice-ai/voice-session.service.server';
import {summarizeConversation} from '~/lib/voice-ai/vertex-assistant.service.server';
import {triggerWebhook} from '~/lib/webhooks';

export async function action({request}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({error: 'Method not allowed'}, {status: 405});
  }

  try {
    const body = await request.json();
    const {sessionId, satisfactionScore} = body;

    if (!sessionId) {
      return json({error: 'Missing sessionId'}, {status: 400});
    }

    // Get session before ending
    const session = await getVoiceSession(sessionId);
    if (!session) {
      return json({error: 'Session not found'}, {status: 404});
    }

    // Generate conversation summary using AI
    let summary = null;
    if (session.conversationHistory.length > 0) {
      try {
        summary = await summarizeConversation(session.conversationHistory);
      } catch (error) {
        console.warn('Could not summarize conversation:', error);
      }
    }

    // End the session
    await endVoiceSession(sessionId, satisfactionScore);

    // Trigger n8n webhook for session completion
    try {
      await triggerWebhook(
        process.env.N8N_WEBHOOK_VOICE_SESSION_ENDED || '',
        {
          sessionId,
          customerId: session.customerId,
          startTime: session.startTime,
          endTime: new Date().toISOString(),
          totalMessages: session.metadata.totalMessages,
          satisfactionScore,
          summary,
          analytics: session.analytics,
        }
      );
    } catch (webhookError) {
      console.warn('n8n webhook failed:', webhookError);
    }

    return json({
      success: true,
      summary,
      analytics: {
        totalMessages: session.metadata.totalMessages,
        intents: session.analytics.intents,
        productsDiscussed: session.analytics.productsDiscussed,
        conversionsAttempted: session.analytics.conversionsAttempted,
      },
    });
  } catch (error) {
    console.error('Error ending voice session:', error);
    return json(
      {
        error: 'Failed to end voice session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      {status: 500}
    );
  }
}
