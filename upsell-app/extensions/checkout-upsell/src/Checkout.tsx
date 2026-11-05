import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useExtensionEditor, useSettings, useTranslate } from '@shopify/ui-extensions/checkout/preact';

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

  if (!collectionSetting) {
    // Buyers never see an unconfigured block; merchants get a hint in the checkout editor.
    return editor ? <s-banner tone="info">{translate('editor.missingCollection')}</s-banner> : null;
  }

  return null;
}
