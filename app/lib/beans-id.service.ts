/**
 * WowStore x Beans iD Student Verification Integration
 *
 * beans-id.com already integrated on Shopify
 * Student verification for exclusive discounts
 */

import {getFirestore} from './firebase.server';

export interface StudentVerification {
  customerId: string;
  email: string;
  verified: boolean;
  beansIdToken?: string;
  institution?: string;
  graduationYear?: string;
  verifiedAt?: string;
  expiresAt?: string;
  discountCode?: string;
}

export interface StudentDiscount {
  code: string;
  percentage: number;
  description: string;
  validUntil: string;
}

/**
 * Check if customer is verified student
 */
export async function isVerifiedStudent(customerId: string): Promise<boolean> {
  try {
    const firestore = getFirestore();
    const doc = await firestore
      .collection('student_verifications')
      .doc(customerId)
      .get();

    if (!doc.exists) {
      return false;
    }

    const data = doc.data() as StudentVerification;

    // Check if verification is still valid
    if (data.expiresAt) {
      const expirationDate = new Date(data.expiresAt);
      if (expirationDate < new Date()) {
        return false; // Expired
      }
    }

    return data.verified === true;
  } catch (error) {
    console.error('Error checking student verification:', error);
    return false;
  }
}

/**
 * Get student verification status
 */
export async function getStudentVerification(
  customerId: string
): Promise<StudentVerification | null> {
  try {
    const firestore = getFirestore();
    const doc = await firestore
      .collection('student_verifications')
      .doc(customerId)
      .get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as StudentVerification;
  } catch (error) {
    console.error('Error fetching student verification:', error);
    return null;
  }
}

/**
 * Store student verification from Beans iD
 * This should be called from Shopify webhooks after Beans iD verification
 */
export async function storeStudentVerification(
  verificationData: StudentVerification
): Promise<void> {
  try {
    const firestore = getFirestore();

    // Set expiration (1 year from verification)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await firestore
      .collection('student_verifications')
      .doc(verificationData.customerId)
      .set({
        ...verificationData,
        verifiedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        updatedAt: new Date().toISOString(),
      });

    console.log(`Student verified: ${verificationData.email}`);
  } catch (error) {
    console.error('Error storing student verification:', error);
    throw new Error('Failed to store verification');
  }
}

/**
 * Get student discount details
 */
export async function getStudentDiscount(
  customerId: string
): Promise<StudentDiscount | null> {
  const isStudent = await isVerifiedStudent(customerId);

  if (!isStudent) {
    return null;
  }

  const verification = await getStudentVerification(customerId);

  return {
    code: verification?.discountCode || 'STUDENT15',
    percentage: 15,
    description: 'Verified Student Discount - 15% off all orders',
    validUntil: verification?.expiresAt || '',
  };
}

/**
 * Generate student discount code
 */
export function generateStudentDiscountCode(email: string): string {
  const hash = email
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `STUDENT${hash % 10000}`;
}

/**
 * Track student discount usage
 */
export async function trackStudentDiscountUsage(
  customerId: string,
  orderData: {
    orderId: string;
    orderNumber: string;
    discountAmount: number;
    totalAmount: number;
  }
): Promise<void> {
  try {
    const firestore = getFirestore();

    await firestore.collection('student_discount_usage').add({
      customerId,
      orderId: orderData.orderId,
      orderNumber: orderData.orderNumber,
      discountAmount: orderData.discountAmount,
      totalAmount: orderData.totalAmount,
      usedAt: new Date().toISOString(),
    });

    // Update total savings
    const verificationRef = firestore
      .collection('student_verifications')
      .doc(customerId);
    const doc = await verificationRef.get();

    if (doc.exists) {
      const currentSavings = doc.data()?.totalSavings || 0;
      await verificationRef.update({
        totalSavings: currentSavings + orderData.discountAmount,
        totalOrders: (doc.data()?.totalOrders || 0) + 1,
      });
    }
  } catch (error) {
    console.error('Error tracking student discount usage:', error);
  }
}

/**
 * Get student savings stats
 */
export async function getStudentSavings(customerId: string): Promise<{
  totalSavings: number;
  totalOrders: number;
  discountCode: string;
  verified: boolean;
}> {
  try {
    const verification = await getStudentVerification(customerId);

    if (!verification || !verification.verified) {
      return {
        totalSavings: 0,
        totalOrders: 0,
        discountCode: '',
        verified: false,
      };
    }

    return {
      totalSavings: (verification as any).totalSavings || 0,
      totalOrders: (verification as any).totalOrders || 0,
      discountCode: verification.discountCode || 'STUDENT15',
      verified: true,
    };
  } catch (error) {
    console.error('Error fetching student savings:', error);
    return {
      totalSavings: 0,
      totalOrders: 0,
      discountCode: '',
      verified: false,
    };
  }
}

/**
 * Beans iD verification webhook handler
 * Called by Shopify when Beans iD verification completes
 */
export async function handleBeansIdWebhook(webhookData: {
  customer_id: string;
  customer_email: string;
  verified: boolean;
  institution?: string;
  graduation_year?: string;
  beans_id_token?: string;
}): Promise<void> {
  try {
    if (!webhookData.verified) {
      console.log('Verification failed or pending');
      return;
    }

    // Generate unique discount code
    const discountCode = generateStudentDiscountCode(webhookData.customer_email);

    // Store verification
    await storeStudentVerification({
      customerId: webhookData.customer_id,
      email: webhookData.customer_email,
      verified: true,
      beansIdToken: webhookData.beans_id_token,
      institution: webhookData.institution,
      graduationYear: webhookData.graduation_year,
      discountCode,
    });

    console.log(
      `Beans iD verification successful: ${webhookData.customer_email} → ${discountCode}`
    );
  } catch (error) {
    console.error('Error handling Beans iD webhook:', error);
  }
}
