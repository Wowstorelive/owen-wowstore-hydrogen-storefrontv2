/**
 * API Route: Voice Add to Cart
 * POST /api/voice/add-to-cart
 * Add products to cart via voice command
 */

import {json, type ActionFunctionArgs} from '@shopify/remix-oxygen';
import {trackConversionAttempt} from '~/lib/voice-ai/voice-session.service.server';

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({error: 'Method not allowed'}, {status: 405});
  }

  try {
    const body = await request.json();
    const {sessionId, productId, variantId, quantity = 1} = body;

    if (!variantId) {
      return json({error: 'Missing variantId'}, {status: 400});
    }

    // Check if user is logged in
    const isLoggedIn = await context.customerAccount.isLoggedIn();
    if (!isLoggedIn) {
      return json({error: 'Authentication required'}, {status: 401});
    }

    // Add to cart using Shopify Cart API
    const {data, errors} = await context.cart.addLines([
      {
        merchandiseId: variantId,
        quantity,
      },
    ]);

    if (errors && errors.length > 0) {
      console.error('Cart errors:', errors);
      return json({
        success: false,
        error: 'Failed to add item to cart',
        details: errors,
      }, {status: 400});
    }

    // Track conversion attempt in voice session
    if (sessionId) {
      try {
        await trackConversionAttempt(sessionId);
      } catch (err) {
        console.warn('Could not track conversion:', err);
      }
    }

    return json({
      success: true,
      cart: data?.cart,
      message: 'Item added to cart successfully',
    });
  } catch (error) {
    console.error('Voice add to cart error:', error);
    return json(
      {
        error: 'Failed to add item to cart',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      {status: 500}
    );
  }
}
