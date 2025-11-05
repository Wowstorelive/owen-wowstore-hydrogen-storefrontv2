/**
 * API Route: Start Voice Session
 * POST /api/voice/start-session
 * Creates a new voice AI session for a user
 */

import {json, type ActionFunctionArgs} from '@shopify/remix-oxygen';
import {createVoiceSession} from '~/lib/voice-ai/voice-session.service.server';
import {triggerWebhook} from '~/lib/webhooks';

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({error: 'Method not allowed'}, {status: 405});
  }

  try {
    const body = await request.json();
    const {language, deviceType} = body;

    // Get customer info if logged in
    let customerId: string | undefined;
    let customerName: string | undefined;

    try {
      const {data, errors} = await context.customerAccount.query(
        `query getCustomer {
          customer {
            id
            firstName
            lastName
          }
        }`
      );

      if (!errors && data?.customer) {
        customerId = data.customer.id;
        customerName = `${data.customer.firstName} ${data.customer.lastName}`.trim();
      }
    } catch (error) {
      // User not logged in - continue as guest
      console.log('Guest user starting voice session');
    }

    // Create voice session
    const session = await createVoiceSession({
      customerId,
      language: language || 'en-US',
      deviceType: deviceType || 'web',
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
    });

    // Track in n8n (optional webhook)
    try {
      await triggerWebhook(
        process.env.N8N_WEBHOOK_VOICE_SESSION_STARTED || '',
        {
          sessionId: session.sessionId,
          customerId: session.customerId,
          deviceType: session.metadata.deviceType,
          startTime: session.startTime,
        }
      );
    } catch (webhookError) {
      console.warn('n8n webhook failed:', webhookError);
      // Continue - webhook is optional
    }

    return json({
      success: true,
      session: {
        sessionId: session.sessionId,
        language: session.language,
        customerId: session.customerId,
        customerName,
      },
    });
  } catch (error) {
    console.error('Error starting voice session:', error);
    return json(
      {
        error: 'Failed to start voice session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      {status: 500}
    );
  }
}
