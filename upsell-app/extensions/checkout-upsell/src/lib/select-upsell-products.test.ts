import { describe, expect, it } from 'vitest';

import { selectUpsellProducts } from './select-upsell-products';
import type { UpsellProduct } from './storefront';

/** Collection in its manual order (deliberately not alphabetical). */
const collection: UpsellProduct[] = ['Daybreak', 'Capri', 'Avalon', 'Bermuda'].map((title, index) => ({
  id: `gid://shopify/Product/${index + 1}`,
  title,
  image: null,
  variantId: `gid://shopify/ProductVariant/${index + 1}0`,
  price: { amount: 100, currencyCode: 'USD' },
}));

const titles = (products: UpsellProduct[]) => products.map((product) => product.title);
const cartWith = (...productNumbers: number[]) =>
  new Set(productNumbers.map((productNumber) => `gid://shopify/Product/${productNumber}`));

describe('selectUpsellProducts', () => {
  it('shows the first two products in collection order when the cart has none of them', () => {
    expect(titles(selectUpsellProducts(collection, cartWith()))).toEqual(['Daybreak', 'Capri']);
  });

  it('replaces a displayed product with the next one once it is in the cart', () => {
    expect(titles(selectUpsellProducts(collection, cartWith(1)))).toEqual(['Capri', 'Avalon']);
  });

  it('replaces both displayed products when both are in the cart', () => {
    expect(titles(selectUpsellProducts(collection, cartWith(1, 2)))).toEqual(['Avalon', 'Bermuda']);
  });

  it('skips products from the cart that are further down the collection', () => {
    expect(titles(selectUpsellProducts(collection, cartWith(2, 3)))).toEqual(['Daybreak', 'Bermuda']);
  });

  it('shows a single product when only one is left', () => {
    expect(titles(selectUpsellProducts(collection, cartWith(1, 2, 3)))).toEqual(['Bermuda']);
  });

  it('returns nothing once every product is in the cart', () => {
    expect(selectUpsellProducts(collection, cartWith(1, 2, 3, 4))).toEqual([]);
  });

  it('ignores cart products that are not part of the collection', () => {
    expect(titles(selectUpsellProducts(collection, cartWith(99)))).toEqual(['Daybreak', 'Capri']);
  });
});
