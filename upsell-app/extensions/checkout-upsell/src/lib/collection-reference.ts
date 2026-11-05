/**
 * Checkout UI extension settings have no collection picker, so the merchant
 * types the collection in a text field. Accepted formats:
 *
 * - handle: `upsell`
 * - numeric ID: `412345678901`
 * - GID: `gid://shopify/Collection/412345678901`
 * - storefront or admin URL: `https://shop.com/collections/upsell`,
 *   `https://admin.shopify.com/store/shop/collections/412345678901`
 */
export type CollectionReference = { id: string } | { handle: string };

const COLLECTION_GID_PREFIX = 'gid://shopify/Collection/';
const NUMERIC_ID = /^\d+$/;
const COLLECTION_PATH = /\/collections\/([^/?#]+)/i;

export function parseCollectionReference(value: unknown): CollectionReference | null {
  if (typeof value !== 'string') return null;

  let reference = value.trim();
  if (!reference) return null;

  if (reference.startsWith(COLLECTION_GID_PREFIX)) {
    return NUMERIC_ID.test(reference.slice(COLLECTION_GID_PREFIX.length)) ? { id: reference } : null;
  }

  const pathMatch = reference.match(COLLECTION_PATH);
  if (pathMatch) reference = safeDecode(pathMatch[1]);

  if (NUMERIC_ID.test(reference)) return { id: `${COLLECTION_GID_PREFIX}${reference}` };

  return { handle: reference.toLowerCase() };
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
