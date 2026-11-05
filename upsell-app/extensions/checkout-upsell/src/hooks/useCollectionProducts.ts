import { useEffect, useState } from 'preact/hooks';
import { useApi, useLocalizationCountry } from '@shopify/ui-extensions/checkout/preact';

import { parseCollectionReference } from '../lib/collection-reference';
import {
  COLLECTION_PRODUCTS_LIMIT,
  COLLECTION_PRODUCTS_QUERY,
  toUpsellProducts,
  type CollectionProductsQueryData,
  type UpsellProduct,
} from '../lib/storefront';

export type CollectionProductsStatus = 'idle' | 'loading' | 'loaded' | 'not-found' | 'error';

export interface CollectionProductsState {
  status: CollectionProductsStatus;
  products: UpsellProduct[];
}

/** A finished request, tagged with the setting and buyer country it was made for. */
interface CollectionProductsResult extends CollectionProductsState {
  requestKey: string;
}

const IDLE: CollectionProductsState = { status: 'idle', products: [] };
const LOADING: CollectionProductsState = { status: 'loading', products: [] };
const NOT_FOUND: CollectionProductsState = { status: 'not-found', products: [] };

/**
 * Loads the purchasable products of the collection configured in the block
 * settings, in collection order and priced for the buyer's country. The
 * request only runs again when the setting or the country changes; filtering
 * by cart contents is done by the caller on every render.
 */
export function useCollectionProducts(collectionSetting: string | undefined): CollectionProductsState {
  const { query } = useApi<'purchase.checkout.block.render'>();
  const country = useLocalizationCountry()?.isoCode;
  const [result, setResult] = useState<CollectionProductsResult | null>(null);

  const requestKey = `${collectionSetting ?? ''}|${country ?? ''}`;

  useEffect(() => {
    const reference = parseCollectionReference(collectionSetting);
    if (!collectionSetting || !reference) return;

    let ignore = false;

    query<CollectionProductsQueryData>(COLLECTION_PRODUCTS_QUERY, {
      variables: { ...reference, first: COLLECTION_PRODUCTS_LIMIT, country: country ?? null },
    })
      .then(({ data, errors }) => {
        if (ignore) return;
        if (errors?.length) throw new Error(errors.map((error) => error.message).join('\n'));

        setResult(
          data?.collection
            ? { requestKey, status: 'loaded', products: toUpsellProducts(data) }
            : { requestKey, status: 'not-found', products: [] },
        );
      })
      .catch((error: unknown) => {
        if (ignore) return;
        console.error('[checkout-upsell] Could not load the upsell collection.', error);
        setResult({ requestKey, status: 'error', products: [] });
      });

    return () => {
      ignore = true;
    };
  }, [collectionSetting, country, requestKey, query]);

  if (!collectionSetting) return IDLE;
  if (!parseCollectionReference(collectionSetting)) return NOT_FOUND;
  // No answer yet for the current setting/country (first load, or one of them just changed).
  if (result?.requestKey !== requestKey) return LOADING;

  return result;
}
