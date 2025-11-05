/**
 * Google Cloud Text-to-Speech Service
 * Converts AI responses to natural-sounding speech
 */

import {TextToSpeechClient} from '@google-cloud/text-to-speech';

// Initialize Text-to-Speech client
let ttsClient: TextToSpeechClient | null = null;

function getTTSClient(): TextToSpeechClient {
  if (!ttsClient) {
    ttsClient = new TextToSpeechClient();
  }
  return ttsClient;
}

export interface VoiceConfig {
  languageCode?: string;
  voiceName?: string;
  ssmlGender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
  speakingRate?: number; // 0.25 to 4.0, default 1.0
  pitch?: number; // -20.0 to 20.0, default 0.0
  volumeGainDb?: number; // -96.0 to 16.0, default 0.0
  audioEncoding?: 'MP3' | 'LINEAR16' | 'OGG_OPUS' | 'MULAW' | 'ALAW';
}

export interface SynthesisResult {
  audioContent: Buffer;
  audioEncoding: string;
  durationMs?: number;
}

/**
 * Predefined voice profiles for different use cases
 */
export const VoiceProfiles = {
  // Professional & friendly (recommended for shopping assistant)
  PROFESSIONAL_FEMALE: {
    languageCode: 'en-US',
    voiceName: 'en-US-Journey-F',
    ssmlGender: 'FEMALE' as const,
    speakingRate: 1.0,
    pitch: 0.0,
  },
  PROFESSIONAL_MALE: {
    languageCode: 'en-US',
    voiceName: 'en-US-Journey-D',
    ssmlGender: 'MALE' as const,
    speakingRate: 1.0,
    pitch: 0.0,
  },
  // Casual & conversational
  CASUAL_FEMALE: {
    languageCode: 'en-US',
    voiceName: 'en-US-Neural2-C',
    ssmlGender: 'FEMALE' as const,
    speakingRate: 1.1,
    pitch: 2.0,
  },
  CASUAL_MALE: {
    languageCode: 'en-US',
    voiceName: 'en-US-Neural2-D',
    ssmlGender: 'MALE' as const,
    speakingRate: 1.1,
    pitch: 0.0,
  },
  // Luxury & sophisticated
  LUXURY_FEMALE: {
    languageCode: 'en-GB',
    voiceName: 'en-GB-Neural2-A',
    ssmlGender: 'FEMALE' as const,
    speakingRate: 0.9,
    pitch: -2.0,
  },
  LUXURY_MALE: {
    languageCode: 'en-GB',
    voiceName: 'en-GB-Neural2-B',
    ssmlGender: 'MALE' as const,
    speakingRate: 0.9,
    pitch: -1.0,
  },
};

/**
 * Convert text to speech audio
 * @param text - Text to synthesize (supports plain text and SSML)
 * @param voiceConfig - Voice configuration options
 * @returns Audio buffer and metadata
 */
export async function synthesizeSpeech(
  text: string,
  voiceConfig: VoiceConfig = VoiceProfiles.PROFESSIONAL_FEMALE
): Promise<SynthesisResult> {
  const client = getTTSClient();

  // Detect if text contains SSML tags
  const isSSML = text.trim().startsWith('<speak>');

  const request = {
    input: isSSML ? {ssml: text} : {text},
    voice: {
      languageCode: voiceConfig.languageCode || 'en-US',
      name: voiceConfig.voiceName,
      ssmlGender: voiceConfig.ssmlGender || 'FEMALE',
    },
    audioConfig: {
      audioEncoding: voiceConfig.audioEncoding || 'MP3',
      speakingRate: voiceConfig.speakingRate || 1.0,
      pitch: voiceConfig.pitch || 0.0,
      volumeGainDb: voiceConfig.volumeGainDb || 0.0,
      effectsProfileId: ['headphone-class-device'], // Optimize for mobile
    },
  };

  try {
    const [response] = await client.synthesizeSpeech(request);

    if (!response.audioContent) {
      throw new Error('No audio content returned from TTS service');
    }

    return {
      audioContent: Buffer.from(response.audioContent as Uint8Array),
      audioEncoding: voiceConfig.audioEncoding || 'MP3',
    };
  } catch (error) {
    console.error('Text-to-Speech error:', error);
    throw new Error(`Failed to synthesize speech: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create SSML markup for enhanced speech control
 * @param text - Plain text to convert
 * @param options - SSML options (pauses, emphasis, etc.)
 */
export function createSSML(
  text: string,
  options: {
    emphasis?: 'strong' | 'moderate' | 'reduced';
    pause?: number; // milliseconds
    sayAs?: 'date' | 'time' | 'telephone' | 'cardinal' | 'ordinal';
  } = {}
): string {
  let ssml = '<speak>';

  if (options.emphasis) {
    ssml += `<emphasis level="${options.emphasis}">${text}</emphasis>`;
  } else if (options.sayAs) {
    ssml += `<say-as interpret-as="${options.sayAs}">${text}</say-as>`;
  } else {
    ssml += text;
  }

  if (options.pause) {
    ssml += `<break time="${options.pause}ms"/>`;
  }

  ssml += '</speak>';
  return ssml;
}

/**
 * Get list of available voices for a language
 */
export async function listAvailableVoices(
  languageCode: string = 'en-US'
): Promise<Array<{name: string; gender: string; naturalSampleRateHertz: number}>> {
  const client = getTTSClient();

  try {
    const [result] = await client.listVoices({languageCode});
    return (result.voices || []).map((voice) => ({
      name: voice.name || '',
      gender: voice.ssmlGender || 'NEUTRAL',
      naturalSampleRateHertz: voice.naturalSampleRateHertz || 24000,
    }));
  } catch (error) {
    console.error('Error listing voices:', error);
    return [];
  }
}

/**
 * Synthesize speech with automatic chunking for long text
 * Splits text into chunks to avoid API limits (5000 chars)
 */
export async function synthesizeLongText(
  text: string,
  voiceConfig: VoiceConfig = VoiceProfiles.PROFESSIONAL_FEMALE
): Promise<SynthesisResult[]> {
  const MAX_CHUNK_SIZE = 4500; // Leave buffer for SSML if needed
  const chunks: string[] = [];

  // Split by sentences to maintain natural flow
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let currentChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > MAX_CHUNK_SIZE) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());

  // Synthesize all chunks
  const results = await Promise.all(
    chunks.map((chunk) => synthesizeSpeech(chunk, voiceConfig))
  );

  return results;
}
