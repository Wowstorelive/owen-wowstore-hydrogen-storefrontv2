import {json, type ActionArgs} from '@shopify/remix-oxygen';
import {base64ToArrayBuffer} from '~/lib/utils';
import {uploadToGCS} from '~/lib/gcs';
import {v4 as uuidv4} from 'uuid';

export async function action({request, context}: ActionArgs) {
  const {env, firestore, gcs, admin} = context;

  const [payload]: any = await Promise.all([request.json()]);

  const {reviews, review, nickname, summary, product, rating, email, files} = payload;

  // Upload images to GCS
  const imageUrls = await Promise.all(
    (files || [])?.map(async (file: any) => {
      try {
        const base64Image = file.fileImageToBase64.split('base64,')[1];
        const imageArrayBuffer = base64ToArrayBuffer(base64Image);
        const fileName = `${uuidv4()}_${file.name}`;

        return await uploadToGCS(
          gcs,
          env.GCS_BUCKET_REVIEW_IMAGES,
          fileName,
          imageArrayBuffer,
          file.type,
        );
      } catch (error) {
        console.error('Error uploading image to GCS:', error);
        return null;
      }
    }),
  );

  const validImageUrls = imageUrls.filter((url) => url !== null) as string[];

  // Calculate average rating
  const averageRating =
    (reviews.reduce((total: any, item: any) => {
      return total + Number(item.rating);
    }, 0) +
      rating) /
    (reviews.length + 1);

  // Update Shopify product metafields
  const metafields = [
    {
      key: 'rating_count',
      namespace: 'custom',
      ownerId: product.id,
      type: 'number_integer',
      value: String(reviews.length + 1),
    },
    {
      key: 'review',
      namespace: 'custom',
      ownerId: product.id,
      type: 'rating',
      value: JSON.stringify({
        scale_min: 1,
        scale_max: 5,
        value: averageRating,
      }),
    },
  ];

  const shopifyResponse = await admin(MUTATE_METAFIELD, {
    variables: {
      metafields,
    },
  });

  // Save review to Firestore
  const reviewData = {
    productId: product.id,
    productHandle: product.handle,
    rating,
    title: summary,
    description: review,
    customerName: nickname,
    customerEmail: email,
    verified: false, // Set to true if you verify purchases
    imageUrls: validImageUrls,
    createdAt: new Date(),
  };

  try {
    const docRef = await firestore.collection('product_reviews').add(reviewData);

    // Trigger n8n webhook for review moderation/analysis (if configured)
    if (env.N8N_WEBHOOK_REVIEW_SUBMITTED) {
      try {
        await fetch(env.N8N_WEBHOOK_REVIEW_SUBMITTED, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            reviewId: docRef.id,
            productId: product.id,
            productHandle: product.handle,
            rating,
            customerEmail: email,
            hasImages: validImageUrls.length > 0,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (webhookError) {
        console.error('n8n webhook failed (review still saved):', webhookError);
      }
    }

    if (shopifyResponse) {
      return json({
        success: true,
        response: {
          ...shopifyResponse,
          data: {
            metafieldsSet: {
              metafields: [
                ...metafields,
                {
                  key: 'review_content',
                  namespace: 'custom',
                  ownerId: product.id,
                  type: 'json',
                  value: JSON.stringify([
                    {
                      rating,
                      title: summary,
                      description: review,
                      customer: {
                        name: nickname,
                        email,
                      },
                      images: validImageUrls,
                      createdAt: new Date(),
                      deletedAt: null,
                    },
                  ]),
                },
              ],
            },
          },
        },
      });
    }
  } catch (error) {
    console.error('Error saving review to Firestore:', error);
    return json({error: 'Failed to save review'}, {status: 500});
  }

  return json({error: 'Failed to update product metafields'}, {status: 500});
}

const MUTATE_METAFIELD = `
  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        key
        namespace
        value
        createdAt
        updatedAt
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;
