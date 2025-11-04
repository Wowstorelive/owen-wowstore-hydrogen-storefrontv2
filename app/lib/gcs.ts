import type {Storage} from '@google-cloud/storage';

/**
 * Upload a file to Google Cloud Storage
 * @param gcs - GCS Storage client
 * @param bucketName - Name of the GCS bucket
 * @param fileName - Name/path for the file in GCS
 * @param fileBuffer - File content as ArrayBuffer
 * @param contentType - MIME type of the file
 * @returns Public URL of the uploaded file
 */
export async function uploadToGCS(
  gcs: Storage,
  bucketName: string,
  fileName: string,
  fileBuffer: ArrayBuffer,
  contentType: string,
): Promise<string> {
  const bucket = gcs.bucket(bucketName);
  const file = bucket.file(fileName);

  // Upload the file
  await file.save(Buffer.from(fileBuffer), {
    contentType,
    metadata: {
      cacheControl: 'public, max-age=31536000', // 1 year cache
    },
  });

  // Make file publicly readable
  await file.makePublic();

  // Return the public URL
  return `https://storage.googleapis.com/${bucketName}/${fileName}`;
}

/**
 * Generate a signed URL for client-side uploads
 * @param gcs - GCS Storage client
 * @param bucketName - Name of the GCS bucket
 * @param fileName - Name/path for the file in GCS
 * @param contentType - MIME type of the file
 * @returns Signed URL and public URL
 */
export async function generateSignedUploadUrl(
  gcs: Storage,
  bucketName: string,
  fileName: string,
  contentType: string,
): Promise<{signedUrl: string; publicUrl: string}> {
  const bucket = gcs.bucket(bucketName);
  const file = bucket.file(fileName);

  const [signedUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType,
  });

  const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

  return {signedUrl, publicUrl};
}
