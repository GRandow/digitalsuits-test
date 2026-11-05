import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useExtensionEditor, useSettings, useTranslate } from '@shopify/ui-extensions/checkout/preact';

import { useCollectionProducts } from './hooks/useCollectionProducts';

export type UpsellSettings = {
  upsell_collection?: string;
  heading?: string;
};

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const settings = useSettings<UpsellSettings>();
  const editor = useExtensionEditor();
  const translate = useTranslate();

  const collectionSetting = settings.upsell_collection?.trim();
  const { status } = useCollectionProducts(collectionSetting);

  // Buyers never see a misconfigured block; merchants get a hint in the checkout editor.
  if (!collectionSetting) {
    return editor ? <s-banner tone="info">{translate('editor.missingCollection')}</s-banner> : null;
  }

  if (status === 'not-found' || status === 'error') {
    return editor ? (
      <s-banner tone="warning">{translate('editor.collectionNotFound', { collection: collectionSetting })}</s-banner>
    ) : null;
  }

  return null;
}
