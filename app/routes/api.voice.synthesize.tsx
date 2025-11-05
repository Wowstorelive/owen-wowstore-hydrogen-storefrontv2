/**
 * API Route: Synthesize Speech
 * POST /api/voice/synthesize
 * Converts text to speech audio
 */

import {type ActionFunctionArgs} from '@shopify/remix-oxygen';
import {synthesizeSpeech, VoiceProfiles} from '~/lib/voice-ai/text-to-speech.service';

export async function action({request}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', {status: 405});
  }

  try {
    const body = await request.json();
    const {text, voiceProfile, languageCode} = body;

    if (!text) {
      return new Response('Missing text parameter', {status: 400});
    }

    // Select voice profile
    let voiceConfig = VoiceProfiles.PROFESSIONAL_FEMALE;
    if (voiceProfile && VoiceProfiles[voiceProfile as keyof typeof VoiceProfiles]) {
      voiceConfig = VoiceProfiles[voiceProfile as keyof typeof VoiceProfiles];
    }

    // Override language if specified
    if (languageCode) {
      voiceConfig = {...voiceConfig, languageCode};
    }

    // Synthesize speech
    const result = await synthesizeSpeech(text, voiceConfig);

    // Return audio as MP3
    return new Response(result.audioContent, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': result.audioContent.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to synthesize speech',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {'Content-Type': 'application/json'},
      }
    );
  }
}
