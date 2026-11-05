import { useApi } from '@shopify/ui-extensions/checkout/preact';

import type { UpsellProduct } from '../lib/storefront';

interface UpsellProductCardProps {
  product: UpsellProduct;
}

export function UpsellProductCard({ product }: UpsellProductCardProps) {
  const { i18n } = useApi<'purchase.checkout.block.render'>();
  const price = i18n.formatCurrency(product.price.amount, { currency: product.price.currencyCode });

  return (
    <s-box border="base" borderRadius="base" padding="base">
      <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
        <s-product-thumbnail src={product.image?.url} alt={product.image?.altText ?? product.title} />
        <s-stack gap="small-500">
          <s-text type="strong">{product.title}</s-text>
          <s-text color="subdued">{price}</s-text>
        </s-stack>
      </s-grid>
    </s-box>
  );
}
