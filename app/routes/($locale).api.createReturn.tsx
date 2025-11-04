import {json, type ActionArgs} from '@shopify/remix-oxygen';
import {base64ToArrayBuffer} from '~/lib/utils';
import {uploadToGCS} from '~/lib/gcs';
import {v4 as uuidv4} from 'uuid';

export async function action({request, context}: ActionArgs) {
  const {env, postgres, gcs, admin} = context;
  const [payload]: any = await Promise.all([request.json()]);
  const {orderId, returnLineItems, files, orderName} = payload;

  const query = `
    mutation ReturnRequest($input: ReturnRequestInput!) {
      returnRequest(input: $input) {
        userErrors {
          field
          message
        }
        return {
          id
          status
          returnLineItems(first: 1) {
            edges {
              node {
                id
                returnReason
                customerNote
              }
            }
          }
          order {
            id
          }
        }
      }
    }
  `;

  // Create return request in Shopify
  const response: any = await admin(query, {
    variables: {
      input: {
        orderId,
        returnLineItems,
      },
    },
  });

  if (response.data?.returnRequest?.return) {
    const returnData = response.data.returnRequest.return;

    // Upload images to GCS
    const imageUrls = await Promise.all(
      (files || []).map(async (file: any) => {
        try {
          const base64Image = file.fileImageToBase64.split('base64,')[1];
          const imageArrayBuffer = base64ToArrayBuffer(base64Image);
          const folderName = orderName.replace('#', '');
          const fileName = `${folderName}/${uuidv4()}_${file.name}`;

          return await uploadToGCS(
            gcs,
            env.GCS_BUCKET_RETURN_IMAGES,
            fileName,
            imageArrayBuffer,
            file.type,
          );
        } catch (error) {
          console.error('Error uploading return image to GCS:', error);
          return null;
        }
      }),
    );

    const validImageUrls = imageUrls.filter((url) => url !== null) as string[];

    // Save to PostgreSQL
    try {
      const client = await postgres.connect();
      try {
        await client.query(
          `INSERT INTO returns (
            return_id,
            order_id,
            order_name,
            shopify_return_id,
            status,
            return_line_items,
            image_urls,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            uuidv4(),
            orderId,
            orderName,
            returnData.id,
            returnData.status,
            JSON.stringify(returnLineItems),
            JSON.stringify(validImageUrls),
          ],
        );
      } finally {
        client.release();
      }

      // Trigger n8n webhook for return processing (optional)
      if (env.N8N_WEBHOOK_RETURN_CREATED) {
        try {
          await fetch(env.N8N_WEBHOOK_RETURN_CREATED, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              orderId,
              orderName,
              returnId: returnData.id,
              status: returnData.status,
              returnLineItems,
              imageUrls: validImageUrls,
              timestamp: new Date().toISOString(),
            }),
          });
        } catch (webhookError) {
          console.error('Error triggering n8n webhook:', webhookError);
          // Don't fail the request if webhook fails
        }
      }

      return json({
        ...response,
        imageUrls: validImageUrls,
      });
    } catch (dbError) {
      console.error('Error saving return to PostgreSQL:', dbError);
      return json(
        {
          error: 'Failed to save return data',
          shopifyResponse: response,
        },
        {status: 500},
      );
    }
  }

  if (response.data?.returnRequest?.userErrors) {
    return json(response);
  }

  return json({error: 'Failed to create return'}, {status: 500});
}
