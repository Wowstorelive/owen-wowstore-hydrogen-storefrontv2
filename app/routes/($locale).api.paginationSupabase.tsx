import {json, type ActionArgs} from '@shopify/remix-oxygen';

export async function action({request, context}: ActionArgs) {
  const [payload]: any = await Promise.all([request.json()]);

  const {productHandle, from, to, limit} = payload;

  const {data: reviewProduct} = await context.supabase.from('product_review').select().eq('productHandle', productHandle).range(from, to).limit(limit)

  return reviewProduct
}
