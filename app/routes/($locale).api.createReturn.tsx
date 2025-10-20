import {type ActionArgs} from '@shopify/remix-oxygen';
import { base64ToArrayBuffer } from '~/lib/utils';
import { v4 as uuidv4 } from 'uuid';

export async function action({request, context}: ActionArgs) {
  const {env, supabase} = context;
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

  const response: any = await context.admin(query, {
    variables: {
      input: {
        orderId,
        returnLineItems,
      }
    }
  });

  if(response.data?.returnRequest?.return) {
    const dataImages = Promise.all(files.map(async (file: any) => {
      const base64Image = file.fileImageToBase64.split('base64,')[1]
      const imageArrayBuffer = base64ToArrayBuffer(base64Image)

      const { data, error } = await supabase.storage.from(env.SUPABASE_BUCKET_RETURNS).upload(`${orderName.replace("#", "")}/${uuidv4()}_${file.name}`, imageArrayBuffer, {
        contentType: file.type,
        upsert: false
      })
      if (error) {
        console.log('error', error);
      } else {
        return `${env.SUPABASE_URL}${env.SUPABASE_PREFIX_BUCKET}${data.fullPath}`
      }
    }));
    return response;
  }

  if(response.data?.returnRequest?.userErrors) {
    return response;
  }

  return null;
}
