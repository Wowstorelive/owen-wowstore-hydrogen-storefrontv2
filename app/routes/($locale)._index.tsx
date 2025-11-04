import {
  defer,
  type MetaArgs,
  type LoaderFunctionArgs,
} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import {Suspense} from 'react';
import {getSeoMeta} from '@shopify/hydrogen';
import {seoPayload} from '~/lib/seo.server';
import {routeHeaders} from '~/data/cache';
import {ModuleSection} from '~/components/ModuleSection';
import {getCmsHome} from '~/lib/firestore-content';

export const headers = routeHeaders;

export async function loader(args: LoaderFunctionArgs) {
  const {params, context} = args;
  const {language, country} = context.storefront.i18n;

  if (
    params.locale &&
    params.locale.toLowerCase() !== `${language}-${country}`.toLowerCase()
  ) {
    // If the locale URL param is defined, yet we still are on `EN-US`
    // the the locale param must be invalid, send to the 404 page
    throw new Response(null, {status: 404});
  }

  const criticalData = await loadCriticalData(args);

  return defer({...criticalData});
}

async function loadCriticalData({context}: LoaderFunctionArgs) {
  const {language} = context.storefront.i18n;
  const {firestore} = context;
  const lang = language.toLowerCase();

  // Fetch home content from Firestore instead of Sanity
  const homeData = await getCmsHome(firestore, lang);

  return {
    homeData,
    seo: seoPayload.home({homeData}),
  };
}

export const meta = ({matches}: MetaArgs<typeof loader>) => {
  return getSeoMeta(...matches.map((match) => (match.data as any).seo));
};

export default function Homepage() {
  const {homeData} = useLoaderData<typeof loader>() as any;

  return (
    <>
      <Suspense>
        {(homeData?.modules || []).map((item: any) => {
          return <ModuleSection key={item._key} item={item} />;
        })}
      </Suspense>
    </>
  );
}
