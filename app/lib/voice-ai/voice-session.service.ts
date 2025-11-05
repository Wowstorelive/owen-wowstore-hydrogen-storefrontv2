/**
 * Voice Session Management Service
 * Manages voice conversation sessions with Firestore persistence
 */

import {getFirestore} from 'firebase-admin/firestore';
import type {ConversationMessage, AssistantContext} from './vertex-assistant.service';

// Initialize Firestore (using existing connection from firestore-content.ts)
let db: FirebaseFirestore.Firestore | null = null;

function getDb(): FirebaseFirestore.Firestore {
  if (!db) {
    db = getFirestore();
  }
  return db;
}

export interface VoiceSession {
  sessionId: string;
  customerId?: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  language: string;
  conversationHistory: ConversationMessage[];
  context: AssistantContext;
  metadata: {
    deviceType: 'web' | 'mobile' | 'phone';
    userAgent?: string;
    ipAddress?: string;
    totalMessages: number;
    totalDuration?: number; // seconds
  };
  analytics: {
    intents: Record<string, number>;
    productsDiscussed: string[];
    conversionsAttempted: number;
    satisfactionScore?: number;
  };
}

/**
 * Create a new voice session
 */
export async function createVoiceSession(
  data: {
    customerId?: string;
    language?: string;
    deviceType: 'web' | 'mobile' | 'phone';
    userAgent?: string;
    ipAddress?: string;
  }
): Promise<VoiceSession> {
  const db = getDb();
  const sessionsRef = db.collection('voice_sessions');

  const session: VoiceSession = {
    sessionId: generateSessionId(),
    customerId: data.customerId,
    startTime: new Date().toISOString(),
    status: 'active',
    language: data.language || 'en-US',
    conversationHistory: [],
    context: {
      customerId: data.customerId,
      language: data.language || 'en-US',
      conversationHistory: [],
    },
    metadata: {
      deviceType: data.deviceType,
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
      totalMessages: 0,
    },
    analytics: {
      intents: {},
      productsDiscussed: [],
      conversionsAttempted: 0,
    },
  };

  await sessionsRef.doc(session.sessionId).set(session);
  return session;
}

/**
 * Get an existing voice session
 */
export async function getVoiceSession(sessionId: string): Promise<VoiceSession | null> {
  const db = getDb();
  const sessionDoc = await db.collection('voice_sessions').doc(sessionId).get();

  if (!sessionDoc.exists) {
    return null;
  }

  return sessionDoc.data() as VoiceSession;
}

/**
 * Update voice session with new message
 */
export async function addMessageToSession(
  sessionId: string,
  message: ConversationMessage,
  intent?: string
): Promise<void> {
  const db = getDb();
  const sessionRef = db.collection('voice_sessions').doc(sessionId);

  const updates: Partial<VoiceSession> = {
    conversationHistory: [...(await getConversationHistory(sessionId)), message],
    'metadata.totalMessages': (await getTotalMessages(sessionId)) + 1,
  };

  // Track intent analytics
  if (intent) {
    const session = await getVoiceSession(sessionId);
    if (session) {
      const intentCount = session.analytics.intents[intent] || 0;
      updates.analytics = {
        ...session.analytics,
        intents: {
          ...session.analytics.intents,
          [intent]: intentCount + 1,
        },
      };
    }
  }

  await sessionRef.update(updates);
}

/**
 * Update session context (cart, products, funnel stage)
 */
export async function updateSessionContext(
  sessionId: string,
  context: Partial<AssistantContext>
): Promise<void> {
  const db = getDb();
  const sessionRef = db.collection('voice_sessions').doc(sessionId);

  const session = await getVoiceSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  await sessionRef.update({
    context: {
      ...session.context,
      ...context,
    },
  });
}

/**
 * End a voice session
 */
export async function endVoiceSession(
  sessionId: string,
  satisfactionScore?: number
): Promise<void> {
  const db = getDb();
  const sessionRef = db.collection('voice_sessions').doc(sessionId);

  const session = await getVoiceSession(sessionId);
  if (!session) {
    return;
  }

  const duration = Math.floor(
    (new Date().getTime() - new Date(session.startTime).getTime()) / 1000
  );

  await sessionRef.update({
    status: 'completed',
    endTime: new Date().toISOString(),
    'metadata.totalDuration': duration,
    ...(satisfactionScore && {'analytics.satisfactionScore': satisfactionScore}),
  });
}

/**
 * Track product discussion in session
 */
export async function trackProductDiscussion(
  sessionId: string,
  productId: string
): Promise<void> {
  const db = getDb();
  const sessionRef = db.collection('voice_sessions').doc(sessionId);

  const session = await getVoiceSession(sessionId);
  if (!session) {
    return;
  }

  const productsDiscussed = session.analytics.productsDiscussed;
  if (!productsDiscussed.includes(productId)) {
    await sessionRef.update({
      'analytics.productsDiscussed': [...productsDiscussed, productId],
    });
  }
}

/**
 * Track conversion attempt (add to cart, checkout)
 */
export async function trackConversionAttempt(sessionId: string): Promise<void> {
  const db = getDb();
  const sessionRef = db.collection('voice_sessions').doc(sessionId);

  const session = await getVoiceSession(sessionId);
  if (!session) {
    return;
  }

  await sessionRef.update({
    'analytics.conversionsAttempted': session.analytics.conversionsAttempted + 1,
  });
}

/**
 * Get all sessions for a customer
 */
export async function getCustomerSessions(
  customerId: string,
  limit: number = 10
): Promise<VoiceSession[]> {
  const db = getDb();
  const snapshot = await db
    .collection('voice_sessions')
    .where('customerId', '==', customerId)
    .orderBy('startTime', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => doc.data() as VoiceSession);
}

/**
 * Get active sessions (for monitoring/admin)
 */
export async function getActiveSessions(limit: number = 50): Promise<VoiceSession[]> {
  const db = getDb();
  const snapshot = await db
    .collection('voice_sessions')
    .where('status', '==', 'active')
    .orderBy('startTime', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => doc.data() as VoiceSession);
}

/**
 * Pause a session (user temporarily leaves)
 */
export async function pauseVoiceSession(sessionId: string): Promise<void> {
  const db = getDb();
  await db.collection('voice_sessions').doc(sessionId).update({
    status: 'paused',
  });
}

/**
 * Resume a paused session
 */
export async function resumeVoiceSession(sessionId: string): Promise<void> {
  const db = getDb();
  await db.collection('voice_sessions').doc(sessionId).update({
    status: 'active',
  });
}

/**
 * Clean up abandoned sessions (older than 1 hour)
 */
export async function cleanupAbandonedSessions(): Promise<number> {
  const db = getDb();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const snapshot = await db
    .collection('voice_sessions')
    .where('status', '==', 'active')
    .where('startTime', '<', oneHourAgo)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, {status: 'abandoned'});
  });

  await batch.commit();
  return snapshot.size;
}

// Helper functions
async function getConversationHistory(sessionId: string): Promise<ConversationMessage[]> {
  const session = await getVoiceSession(sessionId);
  return session?.conversationHistory || [];
}

async function getTotalMessages(sessionId: string): Promise<number> {
  const session = await getVoiceSession(sessionId);
  return session?.metadata.totalMessages || 0;
}

function generateSessionId(): string {
  return `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
