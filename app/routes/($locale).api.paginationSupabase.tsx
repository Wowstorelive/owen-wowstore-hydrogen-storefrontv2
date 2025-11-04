import {json, type LoaderArgs} from '@shopify/remix-oxygen';

export async function loader({request, context}: LoaderArgs) {
  const {firestore} = context;

  const url = new URL(request.url);
  const productHandle = url.searchParams.get('productHandle');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  if (!productHandle) {
    return json({error: 'Product handle is required'}, {status: 400});
  }

  try {
    // Query reviews from Firestore
    const reviewsRef = firestore
      .collection('product_reviews')
      .where('productHandle', '==', productHandle)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset);

    const snapshot = await reviewsRef.get();

    const reviews = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore Timestamp to ISO string for JSON serialization
      createdAt: doc.data().createdAt?.toDate().toISOString(),
    }));

    return json({
      data: reviews,
      total: snapshot.size,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching reviews from Firestore:', error);
    return json({error: 'Failed to fetch reviews'}, {status: 500});
  }
}
