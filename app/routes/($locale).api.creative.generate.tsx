import {json, type ActionFunctionArgs} from '@shopify/remix-oxygen';

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({error: 'Method not allowed'}, {status: 405});
  }

  try {
    const body = await request.json();
    const {projectType, prompt, userId} = body;

    // TODO: Call n8n webhook
    const jobId = `job_${projectType}_${Date.now()}`;

    const estimatedTimes = {
      storybook: '10-15 minutes',
      video: '15-20 minutes',
      campaign: '50-70 minutes',
    };

    return json({
      success: true,
      jobId,
      projectType,
      message: `${projectType} generation started`,
      estimatedTime: estimatedTimes[projectType as keyof typeof estimatedTimes] || '10-20 minutes',
    });
  } catch (error) {
    console.error('Creative generation error:', error);
    return json(
      {
        success: false,
        error: 'Failed to start generation',
      },
      {status: 500},
    );
  }
}
