/**
 * n8n Webhook Utilities
 * Trigger AI workflows and log to PostgreSQL with fallback
 */

import type {Pool} from 'pg';

export interface WebhookPayload {
  [key: string]: any;
}

export interface WebhookResult {
  success: boolean;
  webhookCalled: boolean;
  logged: boolean;
  error?: string;
}

/**
 * Trigger n8n webhook with PostgreSQL fallback logging
 * If webhook URL is not configured, only logs to PostgreSQL
 */
export async function triggerWebhook(
  webhookUrl: string | undefined,
  payload: WebhookPayload,
  postgres?: Pool,
  logTable?: string,
): Promise<WebhookResult> {
  const result: WebhookResult = {
    success: false,
    webhookCalled: false,
    logged: false,
  };

  // Always log to PostgreSQL if available
  if (postgres && logTable) {
    try {
      const client = await postgres.connect();
      try {
        await client.query(
          `INSERT INTO ${logTable} (payload, webhook_url, created_at)
           VALUES ($1, $2, NOW())`,
          [JSON.stringify(payload), webhookUrl || 'not_configured'],
        );
        result.logged = true;
      } finally {
        client.release();
      }
    } catch (logError) {
      console.error(`Failed to log to ${logTable}:`, logError);
    }
  }

  // Call webhook if URL is configured
  if (!webhookUrl) {
    console.log(`Webhook not configured. Event logged to PostgreSQL only.`);
    result.success = result.logged;
    return result;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
    }

    result.webhookCalled = true;
    result.success = true;
    return result;
  } catch (webhookError: any) {
    console.error('Webhook call failed:', webhookError);
    result.error = webhookError.message;
    // Still considered success if logged to DB
    result.success = result.logged;
    return result;
  }
}

/**
 * Track funnel event (visits or conversions)
 */
export async function trackFunnelEvent(
  postgres: Pool,
  eventType: 'visit' | 'conversion',
  data: {
    funnelId: string;
    visitorId: string;
    sessionId?: string;
    stage: string;
    metadata?: Record<string, any>;
    conversionValue?: number;
    orderId?: string;
  },
  webhookUrl?: string,
): Promise<WebhookResult> {
  const payload = {
    eventType,
    timestamp: new Date().toISOString(),
    ...data,
  };

  // Insert directly into appropriate table
  const client = await postgres.connect();
  try {
    if (eventType === 'visit') {
      await client.query(
        `INSERT INTO funnel_visits
         (funnel_id, visitor_id, session_id, stage, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          data.funnelId,
          data.visitorId,
          data.sessionId,
          data.stage,
          JSON.stringify(data.metadata || {}),
        ],
      );
    } else {
      await client.query(
        `INSERT INTO funnel_conversions
         (funnel_id, visitor_id, session_id, stage, conversion_value, order_id, metadata, converted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          data.funnelId,
          data.visitorId,
          data.sessionId,
          data.stage,
          data.conversionValue || 0,
          data.orderId,
          JSON.stringify(data.metadata || {}),
        ],
      );
    }
  } finally {
    client.release();
  }

  // Trigger n8n webhook if configured
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      });
      return {success: true, webhookCalled: true, logged: true};
    } catch (error) {
      console.error('n8n webhook failed (event still logged to DB):', error);
    }
  }

  return {success: true, webhookCalled: false, logged: true};
}

/**
 * Request AI content generation
 */
export async function requestAIContent(
  postgres: Pool,
  data: {
    contentType: string;
    targetId: string;
    prompt: string;
    requestedBy: string;
    metadata?: Record<string, any>;
  },
  webhookUrl?: string,
): Promise<{jobId: string; webhookResult: WebhookResult}> {
  const client = await postgres.connect();
  let jobId: string;

  try {
    // Create AI generation job
    const result = await client.query(
      `INSERT INTO ai_generation_jobs
       (job_type, content_type, target_id, prompt, requested_by, metadata, status, created_at)
       VALUES ('content_generation', $1, $2, $3, $4, $5, 'pending', NOW())
       RETURNING id`,
      [
        data.contentType,
        data.targetId,
        data.prompt,
        data.requestedBy,
        JSON.stringify(data.metadata || {}),
      ],
    );
    jobId = result.rows[0].id;
  } finally {
    client.release();
  }

  // Trigger n8n workflow if configured
  const webhookResult = await triggerWebhook(
    webhookUrl,
    {
      jobId,
      jobType: 'content_generation',
      contentType: data.contentType,
      targetId: data.targetId,
      prompt: data.prompt,
      metadata: data.metadata,
    },
  );

  return {jobId, webhookResult};
}

/**
 * Check AI job status
 */
export async function getAIJobStatus(
  postgres: Pool,
  jobId: string,
): Promise<any> {
  const client = await postgres.connect();
  try {
    const result = await client.query(
      `SELECT * FROM ai_generation_jobs WHERE id = $1`,
      [jobId],
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}
