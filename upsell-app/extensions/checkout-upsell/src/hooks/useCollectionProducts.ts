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

const IDLE: CollectionProductsState = { status: 'idle', products: [] };

/**
 * Loads the purchasable products of the collection configured in the block
 * settings, in collection order. The request runs again only when the
 * setting changes; cart changes are handled by the caller.
 */
export function useCollectionProducts(collectionSetting: string | undefined): CollectionProductsState {
  const { query } = useApi<'purchase.checkout.block.render'>();
  const [state, setState] = useState<CollectionProductsState>(IDLE);

  useEffect(() => {
    const reference = parseCollectionReference(collectionSetting);
    if (!reference) {
      setState(IDLE);
      return;
    }

    let ignore = false;
    setState({ status: 'loading', products: [] });

    query<CollectionProductsQueryData>(COLLECTION_PRODUCTS_QUERY, {
      variables: { ...reference, first: COLLECTION_PRODUCTS_LIMIT },
    })
      .then(({ data, errors }) => {
        if (ignore) return;
        if (errors?.length) throw new Error(errors.map((error) => error.message).join('\n'));

        setState(
          data?.collection
            ? { status: 'loaded', products: toUpsellProducts(data) }
            : { status: 'not-found', products: [] },
        );
      })
      .catch((error: unknown) => {
        if (ignore) return;
        console.error('[checkout-upsell] Could not load the upsell collection.', error);
        setState({ status: 'error', products: [] });
      });

    return () => {
      ignore = true;
    };
  }, [collectionSetting, query]);

  return state;
}
