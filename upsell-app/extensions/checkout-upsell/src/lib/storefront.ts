/**
 * Upper bound of products read from the upsell collection. Upsell collections
 * are small; the Storefront API allows up to 250 per page if needed.
 */
export const COLLECTION_PRODUCTS_LIMIT = 50;

/**
 * `sortKey: COLLECTION_DEFAULT` returns the products in the order configured
 * on the collection (for a manual collection, the order set in the admin), so
 * the upsell follows the same order the merchant sees.
 *
 * `selectedOrFirstAvailableVariant` (without selected options) is the first
 * variant that can be purchased, which is the one added to the cart.
 */
export const COLLECTION_PRODUCTS_QUERY = `#graphql
  query UpsellCollectionProducts($id: ID, $handle: String, $first: Int!) {
    collection(id: $id, handle: $handle) {
      id
      products(first: $first, sortKey: COLLECTION_DEFAULT) {
        nodes {
          id
          title
          availableForSale
          featuredImage {
            url(transform: { maxWidth: 200, maxHeight: 200 })
            altText
          }
          selectedOrFirstAvailableVariant {
            id
            availableForSale
            price {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;

interface StorefrontMoney {
  amount: string;
  currencyCode: string;
}

interface StorefrontProduct {
  id: string;
  title: string;
  availableForSale: boolean;
  featuredImage: { url: string; altText: string | null } | null;
  selectedOrFirstAvailableVariant: {
    id: string;
    availableForSale: boolean;
    price: StorefrontMoney;
  } | null;
}

export interface CollectionProductsQueryData {
  collection: {
    id: string;
    products: { nodes: StorefrontProduct[] };
  } | null;
}

export interface UpsellProduct {
  /** Product GID, compared with `merchandise.product.id` of the cart lines. */
  id: string;
  title: string;
  image: { url: string; altText: string } | null;
  /** Variant GID added to the cart: the first available variant of the product. */
  variantId: string;
  price: { amount: number; currencyCode: string };
}

/** Normalizes the query result, keeping the collection order and dropping products that can't be bought. */
export function toUpsellProducts(data: CollectionProductsQueryData | null | undefined): UpsellProduct[] {
  const products = data?.collection?.products.nodes ?? [];

  return products.flatMap((product) => {
    const variant = product.selectedOrFirstAvailableVariant;
    if (!product.availableForSale || !variant?.availableForSale) return [];

    return [
      {
        id: product.id,
        title: product.title,
        image: product.featuredImage
          ? { url: product.featuredImage.url, altText: product.featuredImage.altText || product.title }
          : null,
        variantId: variant.id,
        price: { amount: Number(variant.price.amount), currencyCode: variant.price.currencyCode },
      },
    ];
  });
}
