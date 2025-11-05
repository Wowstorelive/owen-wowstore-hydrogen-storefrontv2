/**
 * Google Cloud Speech-to-Text Service
 * Handles audio transcription for voice AI interactions
 */

import {SpeechClient} from '@google-cloud/speech';

// Initialize Speech-to-Text client
// In production with Workload Identity, credentials are automatic
let speechClient: SpeechClient | null = null;

function getSpeechClient(): SpeechClient {
  if (!speechClient) {
    speechClient = new SpeechClient();
  }
  return speechClient;
}

export interface TranscriptionConfig {
  languageCode?: string;
  sampleRateHertz?: number;
  encoding?: 'LINEAR16' | 'FLAC' | 'MULAW' | 'AMR' | 'OGG_OPUS' | 'WEBM_OPUS';
  enableAutomaticPunctuation?: boolean;
  model?: 'default' | 'command_and_search' | 'phone_call' | 'video' | 'medical_conversation' | 'medical_dictation';
  useEnhanced?: boolean;
}

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  languageCode: string;
  duration?: number;
}

/**
 * Transcribe audio buffer to text
 * @param audioBuffer - Audio data as Buffer
 * @param config - Transcription configuration
 * @returns Transcription result with text and confidence
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  config: TranscriptionConfig = {}
): Promise<TranscriptionResult> {
  const client = getSpeechClient();

  const request = {
    audio: {
      content: audioBuffer.toString('base64'),
    },
    config: {
      encoding: config.encoding || 'WEBM_OPUS',
      sampleRateHertz: config.sampleRateHertz || 48000,
      languageCode: config.languageCode || 'en-US',
      enableAutomaticPunctuation: config.enableAutomaticPunctuation ?? true,
      model: config.model || 'default',
      useEnhanced: config.useEnhanced ?? true,
    },
  };

  try {
    const [response] = await client.recognize(request);
    const transcription = response.results
      ?.map((result) => result.alternatives?.[0]?.transcript)
      .join('\n') || '';

    const confidence = response.results?.[0]?.alternatives?.[0]?.confidence || 0;

    return {
      transcript: transcription,
      confidence,
      languageCode: config.languageCode || 'en-US',
    };
  } catch (error) {
    console.error('Speech-to-Text error:', error);
    throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create streaming recognition for real-time transcription
 * Returns a transform stream that can be piped to
 */
export function createStreamingRecognition(config: TranscriptionConfig = {}) {
  const client = getSpeechClient();

  const request = {
    config: {
      encoding: config.encoding || 'WEBM_OPUS',
      sampleRateHertz: config.sampleRateHertz || 48000,
      languageCode: config.languageCode || 'en-US',
      enableAutomaticPunctuation: config.enableAutomaticPunctuation ?? true,
      model: config.model || 'command_and_search', // Better for short commands
      useEnhanced: config.useEnhanced ?? true,
    },
    interimResults: true, // Get partial results while speaking
  };

  return client.streamingRecognize(request);
}

/**
 * Transcribe with multi-language support
 * Automatically detects language from supported list
 */
export async function transcribeWithLanguageDetection(
  audioBuffer: Buffer,
  alternativeLanguages: string[] = ['en-US', 'es-ES', 'fr-FR', 'de-DE']
): Promise<TranscriptionResult> {
  const client = getSpeechClient();

  const request = {
    audio: {
      content: audioBuffer.toString('base64'),
    },
    config: {
      encoding: 'WEBM_OPUS' as const,
      sampleRateHertz: 48000,
      languageCode: alternativeLanguages[0],
      alternativeLanguageCodes: alternativeLanguages.slice(1),
      enableAutomaticPunctuation: true,
      model: 'default',
      useEnhanced: true,
    },
  };

  try {
    const [response] = await client.recognize(request);
    const result = response.results?.[0];
    const alternative = result?.alternatives?.[0];

    return {
      transcript: alternative?.transcript || '',
      confidence: alternative?.confidence || 0,
      languageCode: result?.languageCode || alternativeLanguages[0],
    };
  } catch (error) {
    console.error('Language detection error:', error);
    throw new Error(`Failed to transcribe with language detection: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
