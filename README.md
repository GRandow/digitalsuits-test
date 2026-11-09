# DigitalSuits – Shopify Developer test task

| | |
| --- | --- |
| **Store** | `https://STORE-HANDLE.myshopify.com` — storefront password: `PASSWORD` <!-- TODO: fill in before sending --> |
| **Theme** | Dawn 16.1.1 + the custom **Promo banner** section (`theme/`) |
| **App** | Extension-only app with the **Checkout upsell** UI extension (`upsell-app/`) |

```
.
├── theme/                       Dawn 16.1.1 (unchanged) + the promo banner files
│   ├── sections/promo-banner.liquid
│   ├── assets/section-promo-banner.css
│   ├── assets/promo-banner.js
│   └── templates/index.json     (the three Figma variations on the home page)
└── upsell-app/                  Shopify app (extension only, no web server)
    └── extensions/checkout-upsell/
        ├── shopify.extension.toml
        ├── locales/en.default.json
        └── src/
            ├── Checkout.tsx                     entry point, block rendering
            ├── components/UpsellProductCard.tsx card with the Add button
            ├── hooks/useCollectionProducts.ts   Storefront API query
            └── lib/                             pure logic + unit tests
```

The first theme commit imports Dawn untouched, so `git log -- theme/` shows only the work done for the task.

---

## Part 1 — Promo banner section

![Promo banner — desktop variations](docs/screenshots/promo-banner-desktop.png)

A section written from scratch (markup, CSS and JavaScript; no Dawn section or snippet is reused). Add it in the theme editor as **Promo banner**; the preset already contains the Figma copy, colors and typography.

### Settings

| Group | Settings |
| --- | --- |
| Background | Background image · Image subject side · Background color (fallback when there is no image) · Minimum height · Space below the section |
| Card position | Horizontal position (left / right) · Vertical position (top / middle / bottom) · Card width · Card height |
| Card | Card background · Heading color · Text color · Product (optional) · Show product image · Blend product image with card background |
| Text | Heading · Heading size · Text (rich text) · Text and button size · Text alignment · Heading font · Body font |
| Button | Button behavior (hidden / link to a page / add product to cart) · Link label · Button link · Add to cart label · Button style (underlined link / solid) · Button color · Button text color |

Settings that don't apply to the current choice are hidden with `visible_if` (e.g. *Button link* only shows in link mode, *Add to cart label* only in add-to-cart mode).

### Figma variations

All three are on the home page (`templates/index.json`); images and the product are picked in the editor because they reference store files.

| Figma frame | How it is reproduced |
| --- | --- |
| New homepage desktop | Card **left**, product selected, button **hidden** |
| Highlight window | Card **right**, product selected, button in **link** mode ("Shop Men") |
| Content without product | No product selected (or *Show product image* off) |

### Button behavior

- **Link** (preset default, because it is what the Figma shows): a regular `<a>` with the *Link label*. A link without URL is only rendered in the theme editor (as `role="link" aria-disabled="true"`), never as a dead link for buyers.
- **Add product to cart**: a real product form posting to `/cart/add` with the product's `selected_or_first_available_variant`, so it **works without JavaScript** (Shopify redirects to the cart). The label comes from *Add to cart label* (empty → the translated "Add to cart"), and the product title is exposed to screen readers with `aria-describedby`.
  With JavaScript, `<promo-banner-cart-form>` intercepts the submit, posts the same form data to `/cart/add.js` together with the sections Dawn's cart needs (`cart-drawer` + `cart-icon-bubble`, or the notification sections), re-renders Dawn's **cart drawer / cart notification** and opens it. Like Dawn's own product form, it publishes the `cartUpdate` / `cartError` pub/sub events and dispatches Shopify's standard `CartLinesUpdateEvent` / `CartErrorEvent`. If the theme's cart type is *Page*, the native submit is kept.
  States: loading (spinner, `aria-busy`, a status message for screen readers), error (Shopify's message or a translated fallback in a `role="alert"` region), **Sold out** (disabled) when no variant is available. With no product selected, buyers see no button; the editor shows a disabled **Unavailable** placeholder.

### Decisions

- **Image follows the card:** in the Figma the photo is mirrored between the two layouts, so the subject (the shoe) is always on the side opposite the card. *Image subject side* tells the section where the subject is in the uploaded photo; when the card is placed on that same side, the image is mirrored with CSS (`transform: scaleX(-1)`), so a single upload works for both layouts.
- **Positioning:** the card sits in a single grid cell and is aligned with `justify-self` / `align-self`. The card height is a percentage of the banner, so the vertical position is visible whenever it is below 100%.
- **Scoped styles:** values from the editor are CSS custom properties on `#PromoBanner-{{ section.id }}`, so several banners on one page never conflict and `section-promo-banner.css` stays static and cacheable. The script is only loaded when a banner uses add-to-cart mode.
- **Fonts:** *Kessler Display* and *GT America* are not in Shopify's font library, so the defaults are the closest library fonts — **Cormorant** for the heading and **Arial** for the text (Arial is the Figma body font). Both are font pickers.
- **Mobile:** the Figma is desktop only. Below 750px the card keeps floating over the photo, like in the design: full width with a 16px inset, content-driven height, smaller type, and the vertical position setting still applies.
- **Product image:** *Blend product image* (`mix-blend-mode: multiply`) makes white product-photo backgrounds take the card color, like the shoe in the Figma.
- **Translations:** every storefront string goes through `t:` and reuses keys Dawn already translates in its 31 locales (`products.product.add_to_cart`, `products.product.sold_out`, `products.product.unavailable`, `accessibility.loading`, `sections.cart.cart_error`), so the button is translated on non-English storefronts without duplicate keys. Schema labels are plain English, as is usual for a custom client section.
- **Accessibility of the defaults:** the Figma grey `#666666` is 4.38:1 on the beige card, just under WCAG AA; the default text color is `#5E5E5E` (4.9:1), visually the same.

![Promo banner — mobile](docs/screenshots/promo-banner-mobile.png)
![Promo banner — add to cart](docs/screenshots/promo-banner-add-to-cart.gif)

### Run it

```bash
cd theme
shopify theme dev --store STORE-HANDLE      # local preview with hot reload
shopify theme check                         # lint
shopify theme push --unpublished            # upload as a new theme, then publish it in the admin
```

---

## Part 2 — Checkout upsell (Checkout UI extension)

![Checkout upsell](docs/screenshots/checkout-upsell.gif)

A block extension on `purchase.checkout.block.render`, so the merchant can place it anywhere in the checkout editor. It shows two products from a chosen collection, each with an **Add** button.

### How it works

1. **Collection setting** — the block has an *Upsell collection* setting in the checkout editor (plus an optional *Heading*).
2. **Products** — `useCollectionProducts` queries the Storefront API (`api_access = true`) once per setting value:
   `collection(id|handle) { products(first: 50, sortKey: COLLECTION_DEFAULT) { … selectedOrFirstAvailableVariant { … } } }`.
   The query runs `@inContext(country)` with the checkout's country, so prices are in the buyer's market currency. Products that can't be bought are dropped while keeping the collection order (`lib/storefront.ts`).
3. **Cart filtering** — `useCartLines()` re-renders the block on every cart change. The product IDs in the cart are collected and `selectUpsellProducts` returns the first two collection products that are not among them (`lib/select-upsell-products.ts`).
4. **Add** — the button calls `applyCartLinesChange({ type: 'addCartLine', merchandiseId, quantity: 1 })` with a loading state. Once the line is added, the cart lines change, the product disappears and the next product of the collection takes its place. When everything is in the cart, the block renders nothing.

### Decisions

- **Collection setting is a text field.** Checkout UI extension settings only support `boolean`, text, number, date and `variant_reference` fields — there is no `collection_reference`/collection picker. The merchant enters the collection **handle** (e.g. `upsell`); a numeric ID, a GID or a storefront/admin collection URL also work (`lib/collection-reference.ts`).
- **Order:** `sortKey: COLLECTION_DEFAULT` returns products in the sort order configured on the collection — for the manual "Upsell" collection, the drag-and-drop order from the admin.
- **"In the cart" is per product:** if any variant of a product is in the cart, the product is hidden.
- **Products with several variants:** *Add* adds the **first available variant** (`selectedOrFirstAvailableVariant`); its price is the one shown.
- **Sold-out products** (no available variant) and **subscription-only products** (`requiresSellingPlan`, which a one-time Add can't buy) are never displayed and don't take a slot.
- **No collection / unknown collection / nothing left to show:** buyers see nothing. In the checkout editor the merchant sees an info/warning banner explaining why.
- **Checkouts that can't add lines** (`instructions.lines.canAddCartLine === false`, e.g. draft orders) render nothing.
- **Errors:** an `error` result from `applyCartLinesChange` shows a translated banner on the card; Shopify's message (not localized) goes to the console.
- **Loading:** skeleton paragraphs while the collection loads.
- **Stack:** API `2026-10`, Preact + Polaris web components in TypeScript — the stack the current Shopify CLI generates for checkout UI extensions (React is only available up to API 2025-07). `shopify app build` reports ≈ 27 KB (≈ 9.5 KB compressed), below the 64 KB limit.
- **Limit:** the first 50 products of the collection are read, plenty for an upsell collection (the API allows up to 250).

![Checkout editor settings](docs/screenshots/checkout-editor-settings.png)

### Run it

Requires Node.js 22.12+ and a development store with Shopify Plus features (checkout UI extensions in the information/shipping/payment steps).

```bash
cd upsell-app
npm install
npm run dev        # shopify app dev: links/creates the app, installs it on the dev store, opens a preview
npm run check      # ESLint + TypeScript + Vitest
npm run build      # shopify app build
npm run deploy     # shopify app deploy: releases the extension
```

Then in the admin: **Settings → Checkout → Customize**, add the **Checkout upsell** block, set *Upsell collection* to `upsell`, save and publish.

### Manual test plan

| Cart | Expected |
| --- | --- |
| Nothing from the collection | First two collection products, in collection order |
| Add one of them with **Add** | It disappears, the third product takes its place |
| Add both displayed products | Next two products are shown |
| One product of the collection left | Only that product is shown |
| Every product in the cart | Block is not rendered |
| Sold-out product in the collection | Never shown |
| Buyer changes the shipping country (multi-market store) | Prices reload in the new market's currency |
| Product with variants already in the cart (any variant) | Not shown |
| *Upsell collection* empty or wrong | Nothing for buyers, banner in the checkout editor |

---

## Quality checks

| Check | Result |
| --- | --- |
| `shopify theme check` (in `theme/`) | 0 offenses in the files added for this task. Dawn 16.1.1 itself reports 9 warnings in files that were not modified. |
| `npm run lint` (in `upsell-app/`) | Clean |
| `npm run typecheck` | Clean (strict mode) |
| `npm test` | 24 tests passing (collection parsing, normalization, selection scenarios) |
| `npm run build` | Builds the extension (≈ 27 KB, under the 64 KB limit) |
