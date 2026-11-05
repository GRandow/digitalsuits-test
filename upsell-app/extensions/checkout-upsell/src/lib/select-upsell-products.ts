import type { UpsellProduct } from './storefront';

/** How many upsell products are displayed at a time. */
export const UPSELL_PRODUCTS_COUNT = 2;

/**
 * Returns the first `count` collection products that aren't in the cart yet,
 * keeping the collection order.
 *
 * A product counts as "in the cart" when any of its variants is, so a product
 * with several variants disappears as soon as one of them is added. The cart
 * lines are reactive: when a displayed product is added, the next product of
 * the collection takes its place, and once every product is in the cart the
 * result is empty.
 */
export function selectUpsellProducts(
  products: readonly UpsellProduct[],
  cartProductIds: ReadonlySet<string>,
  count: number = UPSELL_PRODUCTS_COUNT,
): UpsellProduct[] {
  return products.filter((product) => !cartProductIds.has(product.id)).slice(0, count);
}
