import { useEffect, useState } from 'preact/hooks';
import { useApi } from '@shopify/ui-extensions/checkout/preact';

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

/** A finished request, tagged with the setting value it was made for. */
interface CollectionProductsResult extends CollectionProductsState {
  setting: string;
}

const IDLE: CollectionProductsState = { status: 'idle', products: [] };
const LOADING: CollectionProductsState = { status: 'loading', products: [] };
const NOT_FOUND: CollectionProductsState = { status: 'not-found', products: [] };

/**
 * Loads the purchasable products of the collection configured in the block
 * settings, in collection order. The request only runs again when the setting
 * changes; filtering by cart contents is done by the caller on every render.
 */
export function useCollectionProducts(collectionSetting: string | undefined): CollectionProductsState {
  const { query } = useApi<'purchase.checkout.block.render'>();
  const [result, setResult] = useState<CollectionProductsResult | null>(null);

  useEffect(() => {
    const reference = parseCollectionReference(collectionSetting);
    if (!collectionSetting || !reference) return;

    let ignore = false;

    query<CollectionProductsQueryData>(COLLECTION_PRODUCTS_QUERY, {
      variables: { ...reference, first: COLLECTION_PRODUCTS_LIMIT },
    })
      .then(({ data, errors }) => {
        if (ignore) return;
        if (errors?.length) throw new Error(errors.map((error) => error.message).join('\n'));

        setResult(
          data?.collection
            ? { setting: collectionSetting, status: 'loaded', products: toUpsellProducts(data) }
            : { setting: collectionSetting, status: 'not-found', products: [] },
        );
      })
      .catch((error: unknown) => {
        if (ignore) return;
        console.error('[checkout-upsell] Could not load the upsell collection.', error);
        setResult({ setting: collectionSetting, status: 'error', products: [] });
      });

    return () => {
      ignore = true;
    };
  }, [collectionSetting, query]);

  if (!collectionSetting) return IDLE;
  if (!parseCollectionReference(collectionSetting)) return NOT_FOUND;
  // No answer yet for the current setting (first load, or the merchant just changed it).
  if (result?.setting !== collectionSetting) return LOADING;

  return result;
}
