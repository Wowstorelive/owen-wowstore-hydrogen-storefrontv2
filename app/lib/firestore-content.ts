import type {Firestore} from '@google-cloud/firestore';

/**
 * Firestore Content Management Utilities
 * Replaces Sanity CMS with Firestore-based content storage
 */

export interface FirestoreContent {
  id?: string;
  language: string;
  updatedAt?: Date;
  [key: string]: any;
}

/**
 * Get CMS settings for a specific language
 */
export async function getCmsSettings(
  firestore: Firestore,
  language: string,
): Promise<any> {
  const settingsRef = firestore
    .collection('cms_settings')
    .where('language', '==', language)
    .limit(1);

  const snapshot = await settingsRef.get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  };
}

/**
 * Get navigation menus for a specific language
 */
export async function getCmsMenus(
  firestore: Firestore,
  language: string,
): Promise<any[]> {
  const menusRef = firestore
    .collection('cms_menus')
    .where('language', '==', language)
    .orderBy('position', 'asc');

  const snapshot = await menusRef.get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Get active color theme
 */
export async function getCmsColorTheme(
  firestore: Firestore,
): Promise<any> {
  const themeRef = firestore
    .collection('cms_color_themes')
    .where('isActive', '==', true)
    .limit(1);

  const snapshot = await themeRef.get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  };
}

/**
 * Get page by slug and language
 */
export async function getCmsPage(
  firestore: Firestore,
  slug: string,
  language: string,
): Promise<any> {
  const pageRef = firestore
    .collection('cms_pages')
    .where('slug', '==', slug)
    .where('language', '==', language)
    .limit(1);

  const snapshot = await pageRef.get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
    // Convert Firestore timestamp to ISO string
    publishedAt: doc.data().publishedAt?.toDate()?.toISOString(),
    updatedAt: doc.data().updatedAt?.toDate()?.toISOString(),
  };
}

/**
 * Get homepage content for a specific language
 */
export async function getCmsHome(
  firestore: Firestore,
  language: string,
): Promise<any> {
  const homeRef = firestore
    .collection('cms_home')
    .where('language', '==', language)
    .limit(1);

  const snapshot = await homeRef.get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
    updatedAt: doc.data().updatedAt?.toDate()?.toISOString(),
  };
}

/**
 * Get collection content by Shopify slug and language
 */
export async function getCmsCollection(
  firestore: Firestore,
  shopifySlug: string,
  language: string,
): Promise<any> {
  const collectionRef = firestore
    .collection('cms_collections')
    .where('shopifySlug', '==', shopifySlug)
    .where('language', '==', language)
    .limit(1);

  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
    updatedAt: doc.data().updatedAt?.toDate()?.toISOString(),
  };
}

/**
 * Get all store locations (active only)
 * Note: This queries PostgreSQL, not Firestore
 */
export async function getStoreLocations(postgres: any): Promise<any[]> {
  const client = await postgres.connect();
  try {
    const result = await client.query(`
      SELECT
        id, store_id, name, slug, address, city, state, country,
        postal_code, phone, email, website, lat, lng, hours,
        status, store_type, features, images, description, metadata
      FROM store_locations
      WHERE status = 'active'
      ORDER BY name ASC
    `);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Find nearest store to given coordinates
 */
export async function findNearestStore(
  postgres: any,
  lat: number,
  lng: number,
): Promise<any> {
  const client = await postgres.connect();
  try {
    const result = await client.query(
      `
      SELECT
        *,
        ST_Distance(
          location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) as distance_meters
      FROM store_locations
      WHERE status = 'active'
      ORDER BY location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      LIMIT 1
      `,
      [lng, lat],
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Find stores within radius (meters)
 */
export async function findStoresWithinRadius(
  postgres: any,
  lat: number,
  lng: number,
  radiusMeters: number = 50000, // 50km default
): Promise<any[]> {
  const client = await postgres.connect();
  try {
    const result = await client.query(
      `
      SELECT
        *,
        ST_Distance(
          location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) as distance_meters
      FROM store_locations
      WHERE status = 'active'
        AND ST_DWithin(
          location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
      ORDER BY distance_meters ASC
      `,
      [lng, lat, radiusMeters],
    );
    return result.rows;
  } finally {
    client.release();
  }
}
