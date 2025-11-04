import {json, type ActionArgs} from '@shopify/remix-oxygen';
import {trackFunnelEvent} from '~/lib/webhooks';

/**
 * Funnel event tracking endpoint
 * Logs customer journey stages to PostgreSQL and triggers n8n workflow
 */
export async function action({request, context}: ActionArgs) {
  const {postgres, env} = context;

  try {
    const payload = await request.json();
    const {
      eventType,
      funnelId,
      visitorId,
      sessionId,
      stage,
      metadata,
      conversionValue,
      orderId,
    } = payload;

    if (!funnelId || !visitorId || !stage) {
      return json(
        {error: 'Missing required fields: funnelId, visitorId, stage'},
        {status: 400},
      );
    }

    if (eventType !== 'visit' && eventType !== 'conversion') {
      return json(
        {error: 'eventType must be "visit" or "conversion"'},
        {status: 400},
      );
    }

    const result = await trackFunnelEvent(
      postgres,
      eventType,
      {
        funnelId,
        visitorId,
        sessionId,
        stage,
        metadata,
        conversionValue,
        orderId,
      },
      env.N8N_WEBHOOK_FUNNEL_EVENT,
    );

    return json({
      success: result.success,
      logged: result.logged,
      webhookCalled: result.webhookCalled,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Funnel event tracking error:', error);
    return json(
      {error: 'Failed to track funnel event', details: error.message},
      {status: 500},
    );
  }
}
