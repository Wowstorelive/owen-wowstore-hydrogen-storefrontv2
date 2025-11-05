import {Firestore} from '@google-cloud/firestore';

let firestore: Firestore | null = null;

export function getFirestore(): Firestore {
  if (!firestore) {
    firestore = new Firestore({
      projectId: process.env.FIREBASE_PROJECT_ID || 'wowstore-ai-media-agent',
      // Uses GOOGLE_APPLICATION_CREDENTIALS environment variable by default
    });
  }
  return firestore;
}

export {Firestore};
