/**
 * Voice AI Module
 * Complete voice shopping assistant powered by Google Cloud AI
 */

// Export all services
export * from './speech-to-text.service';
export * from './text-to-speech.service';
export * from './vertex-assistant.service';
export * from './voice-session.service';

// Re-export commonly used types and functions
export type {
  TranscriptionConfig,
  TranscriptionResult,
} from './speech-to-text.service';

export type {
  VoiceConfig,
  SynthesisResult,
} from './text-to-speech.service';

export type {
  AssistantContext,
  AssistantResponse,
  ConversationMessage,
  ProductContext,
  CartContext,
} from './vertex-assistant.service';

export type {
  VoiceSession,
} from './voice-session.service';

export {VoiceProfiles} from './text-to-speech.service';
