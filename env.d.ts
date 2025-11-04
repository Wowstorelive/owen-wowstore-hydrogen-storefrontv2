/// <reference types="vite/client" />
/// <reference types="@shopify/remix-oxygen" />
/// <reference types="@shopify/oxygen-workers-types" />

import type {
  WithCache,
  HydrogenCart,
  HydrogenSessionData,
} from '@shopify/hydrogen';
import type {Storefront, CustomerAccount} from '~/lib/type';
import type {AppSession} from '~/lib/session.server';
import type {Firestore} from '@google-cloud/firestore';
import type {Storage} from '@google-cloud/storage';
import type {Pool} from 'pg';

declare global {
  /**
   * A global `process` object is only available during build to access NODE_ENV.
   */
  const process: {env: {NODE_ENV: 'production' | 'development'}};

  /**
   * Declare expected Env parameter in fetch handler.
   */
  interface Env {
    SESSION_SECRET: string;
    PUBLIC_STOREFRONT_API_TOKEN: string;
    PRIVATE_STOREFRONT_API_TOKEN: string;
    PUBLIC_STORE_DOMAIN: string;
    PUBLIC_STOREFRONT_ID: string;
    PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: string;
    PUBLIC_CUSTOMER_ACCOUNT_API_URL: string;
    PUBLIC_CHECKOUT_DOMAIN: string;
    PRIVATE_ADMIN_API_TOKEN: string;
    PRIVATE_ADMIN_API_VERSION: string;
    SENDGRID_API_KEY: string;
    GCP_PROJECT_ID: string;
    GCS_BUCKET_REVIEW_IMAGES: string;
    GCS_BUCKET_RETURN_IMAGES: string;
    POSTGRES_HOST: string;
    POSTGRES_PORT: string;
    POSTGRES_DATABASE: string;
    POSTGRES_USER: string;
    POSTGRES_PASSWORD: string;
    N8N_WEBHOOK_RETURNS?: string;
    N8N_WEBHOOK_REVIEW_SUBMITTED?: string;
    N8N_WEBHOOK_RETURN_CREATED?: string;
    N8N_WEBHOOK_CONTENT_REQUESTED?: string;
    N8N_WEBHOOK_FUNNEL_EVENT?: string;
  }
}

declare module '@shopify/remix-oxygen' {
  /**
   * Declare local additions to the Remix loader context.
   */
  export interface AppLoadContext {
    waitUntil: ExecutionContext['waitUntil'];
    session: AppSession;
    storefront: Storefront;
    customerAccount: CustomerAccount;
    admin: AdminClient;
    cart: HydrogenCart;
    firestore: Firestore;
    gcs: Storage;
    postgres: Pool;
    env: Env;
  }

  /**
   * Declare local additions to the Remix session data.
   */
  interface SessionData extends HydrogenSessionData {}
}

// Needed to make this file a module.
export {};
