/**
 * Live Shopping Control Dashboard
 * Beautiful interface to manage live shopping events
 * YouTube, TikTok, Facebook, Instagram integration
 */

import {json, type LoaderFunctionArgs, type ActionFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, useNavigate, useFetcher} from '@remix-run/react';
import {useState, useEffect} from 'react';

export async function loader({context}: LoaderFunctionArgs) {
  const firestore = context.firestore;

  // Get current live shopping status
  const liveDoc = await firestore
    .collection('site_settings')
    .doc('live_shopping')
    .get();

  const liveStatus = liveDoc.exists
    ? liveDoc.data()
    : {isLive: false, platform: null, sessionId: null};

  // Get voice session stats during live
  const voiceSessionsSnapshot = await firestore
    .collection('voice_sessions')
    .where('status', '==', 'active')
    .get();

  return json({
    liveStatus,
    activeVoiceSessions: voiceSessionsSnapshot.size,
  });
}

export async function action({request, context}: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get('action');
  const firestore = context.firestore;

  if (action === 'go-live') {
    const platform = formData.get('platform') as string;
    const streamUrl = formData.get('streamUrl') as string;

    await firestore
      .collection('site_settings')
      .doc('live_shopping')
      .set({
        isLive: true,
        platform,
        streamUrl,
        sessionId: `live-${Date.now()}`,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    return json({success: true, message: 'Live shopping activated!'});
  }

  if (action === 'end-live') {
    const liveDoc = await firestore
      .collection('site_settings')
      .doc('live_shopping')
      .get();

    if (liveDoc.exists) {
      const data = liveDoc.data();
      await firestore
        .collection('site_settings')
        .doc('live_shopping')
        .set({
          ...data,
          isLive: false,
          endedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
    }

    return json({success: true, message: 'Live shopping ended'});
  }

  return json({error: 'Invalid action'}, {status: 400});
}

export default function LiveShoppingDashboard() {
  const {liveStatus, activeVoiceSessions} = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [selectedPlatform, setSelectedPlatform] = useState<string>('youtube');
  const [streamUrl, setStreamUrl] = useState('');
  const [duration, setDuration] = useState(0);

  // Calculate live duration
  useEffect(() => {
    if (liveStatus.isLive && liveStatus.startedAt) {
      const interval = setInterval(() => {
        const start = new Date(liveStatus.startedAt).getTime();
        const now = Date.now();
        setDuration(Math.floor((now - start) / 1000));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [liveStatus]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const platforms = [
    {id: 'youtube', name: 'YouTube', icon: '📺', color: 'red'},
    {id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'black'},
    {id: 'facebook', name: 'Facebook', icon: '👥', color: 'blue'},
    {id: 'instagram', name: 'Instagram', icon: '📸', color: 'pink'},
  ];

  const goLive = () => {
    fetcher.submit(
      {
        action: 'go-live',
        platform: selectedPlatform,
        streamUrl,
      },
      {method: 'post'}
    );
  };

  const endLive = () => {
    if (confirm('Are you sure you want to end the live shopping event?')) {
      fetcher.submit({action: 'end-live'}, {method: 'post'});
    }
  };

  return (
    <div className="live-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            <span className={`live-dot ${liveStatus.isLive ? 'live-dot-active' : ''}`}></span>
            Live Shopping
          </h1>
          <p className="dashboard-subtitle">
            Manage your live shopping events across all platforms
          </p>
        </div>
      </header>

      {/* Live Status Card */}
      {liveStatus.isLive ? (
        <div className="live-status-card active">
          <div className="status-header">
            <div>
              <h2 className="status-title">
                🔴 YOU ARE LIVE
              </h2>
              <p className="status-platform">
                Streaming on {liveStatus.platform?.toUpperCase()}
              </p>
            </div>
            <button onClick={endLive} className="btn-end-live">
              End Live Session
            </button>
          </div>

          <div className="status-stats">
            <div className="stat-box">
              <div className="stat-icon">⏱️</div>
              <div>
                <div className="stat-value">{formatDuration(duration)}</div>
                <div className="stat-label">Duration</div>
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-icon">🎤</div>
              <div>
                <div className="stat-value">{activeVoiceSessions}</div>
                <div className="stat-label">Active Voice Users</div>
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-icon">📊</div>
              <div>
                <div className="stat-value">Live</div>
                <div className="stat-label">Analytics</div>
              </div>
            </div>
          </div>

          {liveStatus.streamUrl && (
            <div className="stream-info">
              <span className="stream-label">Stream URL:</span>
              <a
                href={liveStatus.streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="stream-link"
              >
                {liveStatus.streamUrl}
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="live-status-card inactive">
          <div className="not-live-content">
            <div className="not-live-icon">📡</div>
            <h2 className="not-live-title">Ready to Go Live?</h2>
            <p className="not-live-description">
              Start a live shopping event and engage with your customers in real-time with voice AI
            </p>
          </div>
        </div>
      )}

      {/* Go Live Form */}
      {!liveStatus.isLive && (
        <div className="go-live-card">
          <h3 className="card-title">Start Live Shopping Event</h3>

          {/* Platform Selector */}
          <div className="platform-grid">
            {platforms.map((platform) => (
              <button
                key={platform.id}
                onClick={() => setSelectedPlatform(platform.id)}
                className={`platform-card ${selectedPlatform === platform.id ? 'platform-card-selected' : ''}`}
              >
                <div className="platform-icon">{platform.icon}</div>
                <div className="platform-name">{platform.name}</div>
                {selectedPlatform === platform.id && (
                  <div className="platform-check">✓</div>
                )}
              </button>
            ))}
          </div>

          {/* Stream URL */}
          <div className="form-group">
            <label className="form-label">
              Stream URL (optional)
              <span className="form-hint">Link to your live stream</span>
            </label>
            <input
              type="url"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="form-input"
            />
          </div>

          {/* Go Live Button */}
          <button
            onClick={goLive}
            disabled={fetcher.state === 'submitting'}
            className="btn-go-live"
          >
            <span className="btn-live-icon">🔴</span>
            {fetcher.state === 'submitting' ? 'Going Live...' : 'Go Live'}
          </button>

          {/* Info Cards */}
          <div className="info-cards">
            <div className="info-card">
              <div className="info-icon">💡</div>
              <div>
                <h4 className="info-title">What happens when you go live?</h4>
                <p className="info-text">
                  • Voice assistant shows live badge<br />
                  • Platform indicator displays<br />
                  • Enhanced analytics tracking<br />
                  • Real-time voice session monitoring
                </p>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon">🎯</div>
              <div>
                <h4 className="info-title">Best Practices</h4>
                <p className="info-text">
                  • Mention voice feature early in stream<br />
                  • Test voice assistant before going live<br />
                  • Monitor active voice users<br />
                  • Engage with voice questions
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {fetcher.data?.success && (
        <div className="success-toast">
          ✅ {fetcher.data.message}
        </div>
      )}

      <style>{liveStyles}</style>
    </div>
  );
}

const liveStyles = `
  .live-dashboard {
    min-height: 100vh;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    padding: 2rem;
  }

  .dashboard-header {
    background: white;
    border-radius: 20px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .dashboard-title {
    font-size: 2rem;
    font-weight: 700;
    color: #111827;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .live-dot {
    width: 12px;
    height: 12px;
    background: #9ca3af;
    border-radius: 50%;
  }

  .live-dot-active {
    background: #ef4444;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
    50% { opacity: 0.8; box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  }

  .dashboard-subtitle {
    color: #6b7280;
    margin: 0.5rem 0 0;
  }

  .live-status-card {
    background: white;
    border-radius: 20px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .live-status-card.active {
    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    border: 3px solid #ef4444;
  }

  .status-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .status-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #dc2626;
    margin: 0;
    animation: pulse-text 2s infinite;
  }

  @keyframes pulse-text {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .status-platform {
    color: #991b1b;
    font-weight: 600;
    margin: 0.5rem 0 0;
  }

  .btn-end-live {
    padding: 0.75rem 1.5rem;
    background: white;
    color: #dc2626;
    border: 2px solid #dc2626;
    border-radius: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-end-live:hover {
    background: #dc2626;
    color: white;
  }

  .status-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .stat-box {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .stat-icon {
    font-size: 2rem;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
  }

  .stat-label {
    color: #6b7280;
    font-size: 0.875rem;
  }

  .stream-info {
    margin-top: 1.5rem;
    padding: 1rem;
    background: white;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .stream-label {
    font-weight: 600;
    color: #374151;
  }

  .stream-link {
    color: #3b82f6;
    text-decoration: none;
    word-break: break-all;
  }

  .not-live-content {
    text-align: center;
    padding: 3rem 2rem;
  }

  .not-live-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .not-live-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 0.5rem;
  }

  .not-live-description {
    color: #6b7280;
    margin: 0;
  }

  .go-live-card {
    background: white;
    border-radius: 20px;
    padding: 2rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .card-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 1.5rem;
  }

  .platform-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .platform-card {
    position: relative;
    padding: 1.5rem 1rem;
    background: #f9fafb;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .platform-card:hover {
    background: #f3f4f6;
    transform: translateY(-2px);
  }

  .platform-card-selected {
    background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
    border-color: #8b5cf6;
  }

  .platform-icon {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .platform-name {
    font-weight: 600;
    color: #374151;
  }

  .platform-check {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    width: 24px;
    height: 24px;
    background: #8b5cf6;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
  }

  .form-group {
    margin-bottom: 2rem;
  }

  .form-label {
    display: block;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .form-hint {
    display: block;
    color: #9ca3af;
    font-size: 0.875rem;
    font-weight: 400;
    margin-top: 0.25rem;
  }

  .form-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    font-size: 0.9375rem;
    transition: border-color 0.2s;
  }

  .form-input:focus {
    outline: none;
    border-color: #667eea;
  }

  .btn-go-live {
    width: 100%;
    padding: 1rem 2rem;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 1.125rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 2rem;
  }

  .btn-go-live:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 30px rgba(239, 68, 68, 0.4);
  }

  .btn-go-live:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-live-icon {
    font-size: 1.5rem;
    animation: pulse 2s infinite;
  }

  .info-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
  }

  .info-card {
    padding: 1.5rem;
    background: #f9fafb;
    border-radius: 12px;
    display: flex;
    gap: 1rem;
  }

  .info-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .info-title {
    font-size: 0.9375rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 0.5rem;
  }

  .info-text {
    color: #6b7280;
    font-size: 0.875rem;
    line-height: 1.6;
    margin: 0;
  }

  .success-toast {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 1rem 1.5rem;
    background: #10b981;
    color: white;
    border-radius: 12px;
    font-weight: 600;
    box-shadow: 0 8px 30px rgba(16, 185, 129, 0.3);
    animation: slideIn 0.3s ease;
  }

  @keyframes slideIn {
    from {
      transform: translateY(100px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @media (max-width: 768px) {
    .live-dashboard {
      padding: 1rem;
    }

    .status-header {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .info-cards {
      grid-template-columns: 1fr;
    }
  }
`;
