import {json, type ActionArgs} from '@shopify/remix-oxygen';
import {requestAIContent, getAIJobStatus} from '~/lib/webhooks';

/**
 * AI content generation endpoint
 * Creates job in PostgreSQL and triggers n8n → Python AI workflow
 */
export async function action({request, context}: ActionArgs) {
  const {postgres, env} = context;

  try {
    const payload = await request.json();
    const {contentType, targetId, prompt, requestedBy, metadata} = payload;

    if (!contentType || !targetId || !prompt) {
      return json(
        {error: 'Missing required fields: contentType, targetId, prompt'},
        {status: 400},
      );
    }

    const {jobId, webhookResult} = await requestAIContent(
      postgres,
      {
        contentType,
        targetId,
        prompt,
        requestedBy: requestedBy || 'api',
        metadata,
      },
      env.N8N_WEBHOOK_CONTENT_REQUESTED,
    );

    return json({
      success: true,
      jobId,
      webhookCalled: webhookResult.webhookCalled,
      message: webhookResult.webhookCalled
        ? 'AI generation job created and n8n workflow triggered'
        : 'AI generation job created (n8n webhook not configured)',
      statusUrl: `/api/ai/job-status?jobId=${jobId}`,
    });
  } catch (error: any) {
    console.error('AI content generation error:', error);
    return json(
      {error: 'Failed to request AI content generation', details: error.message},
      {status: 500},
    );
  }
}

/**
 * Check AI job status (GET request)
 */
export async function loader({request, context}: any) {
  const {postgres} = context;
  const url = new URL(request.url);
  const jobId = url.searchParams.get('jobId');

  if (!jobId) {
    return json({error: 'Missing jobId parameter'}, {status: 400});
  }

  try {
    const job = await getAIJobStatus(postgres, jobId);

    if (!job) {
      return json({error: 'Job not found'}, {status: 404});
    }

    return json({
      jobId: job.id,
      status: job.status,
      contentType: job.content_type,
      targetId: job.target_id,
      result: job.result,
      errorMessage: job.error_message,
      createdAt: job.created_at,
      completedAt: job.completed_at,
      tokensUsed: job.tokens_used,
      cost: job.cost,
    });
  } catch (error: any) {
    console.error('AI job status check error:', error);
    return json(
      {error: 'Failed to check job status', details: error.message},
      {status: 500},
    );
  }
}
