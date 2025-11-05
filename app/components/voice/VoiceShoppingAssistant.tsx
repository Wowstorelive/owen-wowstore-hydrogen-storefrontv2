/**
 * Voice Shopping Assistant Component
 * Authenticated voice AI for product inquiries and shopping
 * Perfect for accessibility (handicapped users) and convenience (driving)
 */

import {useState, useEffect, useRef} from 'react';
import {useNavigate} from '@remix-run/react';
import {useTranslation} from 'react-i18next';

interface VoiceShoppingAssistantProps {
  isAuthenticated: boolean;
  customer?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
  productContext?: {
    id: string;
    title: string;
    price: string;
    available: boolean;
  };
  funnelContext?: {
    stage: string;
    code: string;
  };
  liveShoppingContext?: {
    isLive: boolean;
    platform?: 'youtube' | 'tiktok' | 'facebook' | 'instagram';
    sessionId?: string;
  };
  className?: string;
}

export function VoiceShoppingAssistant({
  isAuthenticated,
  customer,
  productContext,
  funnelContext,
  liveShoppingContext,
  className = '',
}: VoiceShoppingAssistantProps) {
  const {t} = useTranslation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize voice session when authenticated and opened
  useEffect(() => {
    if (isAuthenticated && isOpen && !sessionId) {
      initializeSession();
    }
  }, [isAuthenticated, isOpen]);

  const initializeSession = async () => {
    try {
      const response = await fetch('/api/voice/start-session', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          language: 'en-US',
          deviceType: /mobile|tablet/i.test(navigator.userAgent) ? 'mobile' : 'web',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSessionId(data.session.sessionId);
      } else {
        setError('Failed to start voice session');
      }
    } catch (err) {
      console.error('Session init error:', err);
      setError('Could not connect to voice assistant');
    }
  };

  const startListening = async () => {
    if (!isAuthenticated) {
      setError('Please login to use voice assistant');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {type: 'audio/webm'});
        await processAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
      setError('');
    } catch (err) {
      console.error('Microphone error:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    if (!sessionId) {
      setError('No active session');
      return;
    }

    setIsProcessing(true);
    setTranscript('');
    setResponse('');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('sessionId', sessionId);
      formData.append('language', 'en-US');

      const response = await fetch('/api/voice/process-audio', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setTranscript(data.transcription.text);
        setResponse(data.response.text);

        // Execute suggested actions
        if (data.response.actions && data.response.actions.length > 0) {
          handleSuggestedActions(data.response.actions);
        }

        // Play voice response
        await playVoiceResponse(data.response.text);
      } else {
        setError(data.error || 'Failed to process audio');
      }
    } catch (err) {
      console.error('Processing error:', err);
      setError('Failed to process your request');
    } finally {
      setIsProcessing(false);
    }
  };

  const playVoiceResponse = async (text: string) => {
    try {
      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          text,
          voiceProfile: 'PROFESSIONAL_FEMALE',
        }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
        }
      }
    } catch (err) {
      console.error('TTS error:', err);
    }
  };

  const handleSuggestedActions = (actions: Array<{type: string; data: any}>) => {
    actions.forEach((action) => {
      switch (action.type) {
        case 'search_products':
          navigate(`/search?q=${encodeURIComponent(action.data.query)}`);
          break;
        case 'navigate_to_checkout':
          navigate('/cart');
          break;
        case 'show_orders':
          navigate('/account/orders');
          break;
        case 'navigate_funnel':
          if (funnelContext) {
            // Handle funnel navigation
          }
          break;
      }
    });
  };

  const endSession = async () => {
    if (sessionId) {
      try {
        await fetch('/api/voice/end-session', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({sessionId}),
        });
      } catch (err) {
        console.error('End session error:', err);
      }
    }
    setSessionId(null);
    setIsOpen(false);
    setTranscript('');
    setResponse('');
  };

  if (!isAuthenticated) {
    return (
      <div className={`voice-assistant-locked ${className}`}>
        <button
          onClick={() => navigate('/account/login')}
          className="voice-btn voice-btn-locked"
          aria-label="Login to use voice assistant"
        >
          <MicrophoneIcon className="w-6 h-6" />
          <LockIcon className="w-3 h-3 absolute top-0 right-0" />
        </button>
        <div className="voice-tooltip">
          {t('voice.loginRequired')} - Voice shopping for accessibility &amp; convenience
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`voice-assistant ${className}`}>
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="voice-btn voice-btn-trigger"
            aria-label="Open voice assistant"
          >
            <MicrophoneIcon className="w-6 h-6" />
            {liveShoppingContext?.isLive && (
              <span className="live-indicator">LIVE</span>
            )}
          </button>
        ) : (
          <div className="voice-assistant-panel">
            {/* Header */}
            <div className="voice-header">
              <h3 className="voice-title">
                {t('voice.assistant')}
                {customer && ` - ${customer.firstName}`}
              </h3>
              <button
                onClick={endSession}
                className="voice-close"
                aria-label="Close voice assistant"
              >
                ×
              </button>
            </div>

            {/* Live Shopping Badge */}
            {liveShoppingContext?.isLive && (
              <div className="live-shopping-badge">
                <span className="live-dot"></span>
                LIVE on {liveShoppingContext.platform?.toUpperCase()}
              </div>
            )}

            {/* Product Context */}
            {productContext && (
              <div className="voice-context">
                <p className="text-sm opacity-80">
                  {t('voice.askingAbout')}: <strong>{productContext.title}</strong>
                </p>
              </div>
            )}

            {/* Microphone Button */}
            <div className="voice-controls">
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing}
                className={`voice-mic-btn ${isListening ? 'listening' : ''} ${isProcessing ? 'processing' : ''}`}
                aria-label={isListening ? 'Stop recording' : 'Start recording'}
              >
                {isProcessing ? (
                  <LoadingIcon className="w-12 h-12 animate-spin" />
                ) : isListening ? (
                  <div className="listening-animation">
                    <MicrophoneIcon className="w-12 h-12" />
                    <span className="pulse"></span>
                  </div>
                ) : (
                  <MicrophoneIcon className="w-12 h-12" />
                )}
              </button>
              <p className="voice-status">
                {isProcessing
                  ? t('voice.processing')
                  : isListening
                  ? t('voice.listening')
                  : t('voice.tapToSpeak')}
              </p>
            </div>

            {/* Transcript */}
            {transcript && (
              <div className="voice-transcript">
                <strong>{t('voice.youSaid')}:</strong>
                <p>{transcript}</p>
              </div>
            )}

            {/* Response */}
            {response && (
              <div className="voice-response">
                <strong>{t('voice.assistant')}:</strong>
                <p>{response}</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="voice-error">
                <p>{error}</p>
              </div>
            )}

            {/* Accessibility Note */}
            <div className="voice-accessibility-note">
              <AccessibilityIcon className="w-4 h-4" />
              <span className="text-xs">
                {t('voice.accessibilityNote')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Hidden audio player */}
      <audio ref={audioRef} className="hidden" />

      <style>{`
        .voice-assistant {
          position: relative;
        }

        .voice-assistant-locked {
          position: relative;
        }

        .voice-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          transition: all 0.3s ease;
        }

        .voice-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.6);
        }

        .voice-btn-locked {
          background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
        }

        .live-indicator {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: white;
          font-size: 8px;
          font-weight: bold;
          padding: 2px 4px;
          border-radius: 4px;
          animation: pulse 2s infinite;
        }

        .voice-tooltip {
          position: absolute;
          bottom: -40px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
        }

        .voice-assistant-locked:hover .voice-tooltip {
          opacity: 1;
        }

        .voice-assistant-panel {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 380px;
          max-width: calc(100vw - 48px);
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          padding: 20px;
          z-index: 1000;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .voice-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        .voice-title {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .voice-close {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: #f3f4f6;
          font-size: 24px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .voice-close:hover {
          background: #e5e7eb;
        }

        .live-shopping-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .voice-context {
          background: #f9fafb;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .voice-controls {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 20px 0;
        }

        .voice-mic-btn {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
        }

        .voice-mic-btn:hover:not(:disabled) {
          transform: scale(1.05);
        }

        .voice-mic-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .voice-mic-btn.listening {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          animation: pulse-ring 1.5s infinite;
        }

        @keyframes pulse-ring {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            box-shadow: 0 0 0 20px rgba(239, 68, 68, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }

        .listening-animation {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .listening-animation .pulse {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          animation: pulse-scale 1.5s infinite;
        }

        @keyframes pulse-scale {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        .voice-status {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        .voice-transcript,
        .voice-response {
          background: #f9fafb;
          padding: 12px;
          border-radius: 8px;
          margin-top: 12px;
        }

        .voice-transcript strong,
        .voice-response strong {
          display: block;
          margin-bottom: 6px;
          color: #374151;
          font-size: 13px;
        }

        .voice-transcript p,
        .voice-response p {
          color: #111827;
          line-height: 1.5;
          font-size: 14px;
        }

        .voice-response {
          background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
        }

        .voice-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          padding: 12px;
          border-radius: 8px;
          margin-top: 12px;
          font-size: 14px;
        }

        .voice-accessibility-note {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .voice-assistant-panel {
            position: fixed;
            bottom: 0;
            right: 0;
            left: 0;
            width: 100%;
            max-width: 100%;
            border-radius: 16px 16px 0 0;
          }
        }
      `}</style>
    </>
  );
}

// Icon Components
function MicrophoneIcon({className = ''}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function LockIcon({className = ''}: {className?: string}) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
    </svg>
  );
}

function LoadingIcon({className = ''}: {className?: string}) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

function AccessibilityIcon({className = ''}: {className?: string}) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 2a2 2 0 100 4 2 2 0 000-4zM3 7a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM10 9a1 1 0 011 1v6a1 1 0 11-2 0v-6a1 1 0 011-1zM6 14a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" />
    </svg>
  );
}
