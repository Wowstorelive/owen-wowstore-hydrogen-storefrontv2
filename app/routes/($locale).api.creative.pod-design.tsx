import {json, type ActionFunctionArgs} from '@shopify/remix-oxygen';

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({error: 'Method not allowed'}, {status: 405});
  }

  try {
    const body = await request.json();
    const {prompt, userId, style} = body;

    // TODO: Call n8n webhook or Firebase Cloud Function
    // For now, return mock response
    const jobId = `job_${Date.now()}`;

    // In production, this would trigger your n8n workflow:
    // const response = await fetch(process.env.N8N_WEBHOOK_URL, {
    //   method: 'POST',
    //   headers: {'Content-Type': 'application/json'},
    //   body: JSON.stringify({
    //     projectType: 'pod-design',
    //     prompt,
    //     userId,
    //     style,
    //   }),
    // });

    return json({
      success: true,
      jobId,
      message: 'Design generation started',
      estimatedTime: '2-3 minutes',
    });
  } catch (error) {
    console.error('POD design generation error:', error);
    return json(
      {
        success: false,
        error: 'Failed to start design generation',
      },
      {status: 500},
    );
  }
}
