import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useMemo } from 'preact/hooks';
import {
  useCartLines,
  useExtensionEditor,
  useInstructions,
  useSettings,
  useTranslate,
} from '@shopify/ui-extensions/checkout/preact';

import { UpsellProductCard } from './components/UpsellProductCard';
import { useCollectionProducts } from './hooks/useCollectionProducts';
import { selectUpsellProducts } from './lib/select-upsell-products';

export type UpsellSettings = {
  upsell_collection?: string;
  heading?: string;
};

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const settings = useSettings<UpsellSettings>();
  const cartLines = useCartLines();
  const instructions = useInstructions();
  const editor = useExtensionEditor();
  const translate = useTranslate();

  const collectionSetting = settings.upsell_collection?.trim();
  const { status, products } = useCollectionProducts(collectionSetting);

  const cartProductIds = useMemo(
    () => new Set(cartLines.map((line) => line.merchandise.product.id)),
    [cartLines],
  );
  const upsellProducts = selectUpsellProducts(products, cartProductIds);

  // Buyers never see a misconfigured block; merchants get a hint in the checkout editor.
  if (!collectionSetting) {
    return editor ? <s-banner tone="info">{translate('editor.missingCollection')}</s-banner> : null;
  }

  if (status === 'not-found' || status === 'error') {
    return editor ? (
      <s-banner tone="warning">{translate('editor.collectionNotFound', { collection: collectionSetting })}</s-banner>
    ) : null;
  }

  // Some checkouts (e.g. draft orders) don't allow adding lines, so there is nothing to offer.
  if (!instructions.lines.canAddCartLine) return null;

  if (status === 'loading') return <UpsellSkeleton />;

  // Every product of the collection is already in the cart (or none can be bought).
  if (upsellProducts.length === 0) {
    return editor ? <s-banner tone="info">{translate('editor.nothingToShow')}</s-banner> : null;
  }

  // A tinted panel with its own heading keeps the offers visually apart from the cart lines.
  return (
    <s-box background="subdued" borderRadius="base" padding="base">
      <s-stack gap="base">
        <s-stack gap="small-500">
          <s-heading>{settings.heading?.trim() || translate('heading')}</s-heading>
          <s-text color="subdued">{translate('notInCart')}</s-text>
        </s-stack>
        <s-stack gap="small-200" accessibilityRole="unordered-list">
          {upsellProducts.map((product) => (
            <s-stack key={product.id} accessibilityRole="list-item">
              <UpsellProductCard product={product} />
            </s-stack>
          ))}
        </s-stack>
      </s-stack>
    </s-box>
  );
}

function UpsellSkeleton() {
  return (
    <s-stack gap="base">
      <s-skeleton-paragraph />
      <s-skeleton-paragraph />
    </s-stack>
  );
}
