/**
 * Product-specific Voice Assistant
 * Allows users to ask questions about products via voice
 */

import {VoiceShoppingAssistant} from './VoiceShoppingAssistant';

interface ProductVoiceAssistantProps {
  product: {
    id: string;
    title: string;
    handle: string;
    selectedVariant?: {
      price: {
        amount: string;
      };
      availableForSale: boolean;
    };
  };
  customer?: {
    id: string;
    firstName?: string;
    lastName?: string;
  } | null;
  liveShoppingContext?: {
    isLive: boolean;
    platform?: 'youtube' | 'tiktok' | 'facebook' | 'instagram';
    sessionId?: string;
  };
}

export function ProductVoiceAssistant({
  product,
  customer,
  liveShoppingContext,
}: ProductVoiceAssistantProps) {
  const isAuthenticated = !!customer;

  const productContext = {
    id: product.id,
    title: product.title,
    price: product.selectedVariant?.price.amount || '0',
    available: product.selectedVariant?.availableForSale ?? false,
  };

  return (
    <VoiceShoppingAssistant
      isAuthenticated={isAuthenticated}
      customer={customer || undefined}
      productContext={productContext}
      liveShoppingContext={liveShoppingContext}
      className="product-voice-assistant fixed bottom-6 right-6 z-50"
    />
  );
}
