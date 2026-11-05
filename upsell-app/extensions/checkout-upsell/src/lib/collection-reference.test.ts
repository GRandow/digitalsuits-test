import { describe, expect, it } from 'vitest';

import { parseCollectionReference } from './collection-reference';

describe('parseCollectionReference', () => {
  it('reads a handle, ignoring surrounding spaces and case', () => {
    expect(parseCollectionReference(' Upsell ')).toEqual({ handle: 'upsell' });
  });

  it('turns a numeric ID into a collection GID', () => {
    expect(parseCollectionReference('412345678901')).toEqual({ id: 'gid://shopify/Collection/412345678901' });
  });

  it('accepts a collection GID as is', () => {
    expect(parseCollectionReference('gid://shopify/Collection/412345678901')).toEqual({
      id: 'gid://shopify/Collection/412345678901',
    });
  });

  it('rejects a malformed collection GID', () => {
    expect(parseCollectionReference('gid://shopify/Collection/upsell')).toBeNull();
  });

  it('extracts the handle from a storefront URL', () => {
    expect(parseCollectionReference('https://shop.example/collections/upsell?page=2#top')).toEqual({
      handle: 'upsell',
    });
  });

  it('extracts the ID from an admin URL', () => {
    expect(parseCollectionReference('https://admin.shopify.com/store/demo/collections/412345678901')).toEqual({
      id: 'gid://shopify/Collection/412345678901',
    });
  });

  it('decodes encoded handles from URLs', () => {
    expect(parseCollectionReference('/collections/caf%C3%A9')).toEqual({ handle: 'café' });
  });

  it.each([undefined, null, '', '   ', 42, true])('returns null for %p', (value) => {
    expect(parseCollectionReference(value)).toBeNull();
  });
});
