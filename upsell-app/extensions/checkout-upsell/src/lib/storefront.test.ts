import { describe, expect, it } from 'vitest';

import { toUpsellProducts, type CollectionProductsQueryData } from './storefront';

type StorefrontProduct = NonNullable<CollectionProductsQueryData['collection']>['products']['nodes'][number];

function storefrontProduct(id: string, overrides: Partial<StorefrontProduct> = {}): StorefrontProduct {
  return {
    id: `gid://shopify/Product/${id}`,
    title: `Product ${id}`,
    availableForSale: true,
    featuredImage: { url: `https://cdn.example/${id}.jpg`, altText: `Image ${id}` },
    selectedOrFirstAvailableVariant: {
      id: `gid://shopify/ProductVariant/${id}1`,
      availableForSale: true,
      price: { amount: '25.0', currencyCode: 'USD' },
    },
    ...overrides,
  };
}

function queryData(nodes: StorefrontProduct[]): CollectionProductsQueryData {
  return { collection: { id: 'gid://shopify/Collection/1', products: { nodes } } };
}

describe('toUpsellProducts', () => {
  it('keeps the collection order and maps the fields used by the cards', () => {
    const products = toUpsellProducts(queryData([storefrontProduct('3'), storefrontProduct('1')]));

    expect(products.map((product) => product.id)).toEqual(['gid://shopify/Product/3', 'gid://shopify/Product/1']);
    expect(products[0]).toEqual({
      id: 'gid://shopify/Product/3',
      title: 'Product 3',
      image: { url: 'https://cdn.example/3.jpg', altText: 'Image 3' },
      variantId: 'gid://shopify/ProductVariant/31',
      price: { amount: 25, currencyCode: 'USD' },
    });
  });

  it('drops sold-out products and products without an available variant', () => {
    const products = toUpsellProducts(
      queryData([
        storefrontProduct('1', { availableForSale: false }),
        storefrontProduct('2', { selectedOrFirstAvailableVariant: null }),
        storefrontProduct('3', {
          selectedOrFirstAvailableVariant: {
            id: 'gid://shopify/ProductVariant/31',
            availableForSale: false,
            price: { amount: '10.0', currencyCode: 'USD' },
          },
        }),
        storefrontProduct('4'),
      ]),
    );

    expect(products.map((product) => product.id)).toEqual(['gid://shopify/Product/4']);
  });

  it('falls back to the product title for missing alt text and handles missing images', () => {
    const [withoutAlt, withoutImage] = toUpsellProducts(
      queryData([
        storefrontProduct('1', { featuredImage: { url: 'https://cdn.example/1.jpg', altText: null } }),
        storefrontProduct('2', { featuredImage: null }),
      ]),
    );

    expect(withoutAlt.image).toEqual({ url: 'https://cdn.example/1.jpg', altText: 'Product 1' });
    expect(withoutImage.image).toBeNull();
  });

  it('returns an empty list when the collection does not exist', () => {
    expect(toUpsellProducts({ collection: null })).toEqual([]);
    expect(toUpsellProducts(undefined)).toEqual([]);
  });
});
