import { useState } from 'preact/hooks';
import { useApi, useApplyCartLinesChange, useTranslate } from '@shopify/ui-extensions/checkout/preact';

import type { UpsellProduct } from '../lib/storefront';

interface UpsellProductCardProps {
  product: UpsellProduct;
}

export function UpsellProductCard({ product }: UpsellProductCardProps) {
  const { i18n } = useApi<'purchase.checkout.block.render'>();
  const applyCartLinesChange = useApplyCartLinesChange();
  const translate = useTranslate();

  const [isAdding, setIsAdding] = useState(false);
  const [hasError, setHasError] = useState(false);

  const price = i18n.formatCurrency(product.price.amount, { currency: product.price.currencyCode });

  async function handleAdd() {
    setIsAdding(true);
    setHasError(false);

    try {
      const result = await applyCartLinesChange({
        type: 'addCartLine',
        merchandiseId: product.variantId,
        quantity: 1,
      });

      if (result.type === 'error') {
        // Shopify's message isn't localized, so buyers get our own copy and the details go to the console.
        console.error('[checkout-upsell] Could not add the product to the cart.', result.message);
        setHasError(true);
      }
    } catch (error) {
      console.error('[checkout-upsell] Could not add the product to the cart.', error);
      setHasError(true);
    } finally {
      // On success the card unmounts: the product is now in the cart and the next one takes its place.
      setIsAdding(false);
    }
  }

  return (
    <s-box border="base" borderRadius="base" padding="base">
      <s-stack gap="base">
        <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
          <s-product-thumbnail src={product.image?.url} alt={product.image?.altText ?? product.title} />
          <s-stack gap="small-500">
            <s-text type="strong">{product.title}</s-text>
            <s-text color="subdued">{price}</s-text>
          </s-stack>
          <s-button
            variant="secondary"
            loading={isAdding}
            accessibilityLabel={translate('addProduct', { product: product.title })}
            onClick={handleAdd}
          >
            {translate('add')}
          </s-button>
        </s-grid>
        {hasError && <s-banner tone="critical">{translate('addError')}</s-banner>}
      </s-stack>
    </s-box>
  );
}
