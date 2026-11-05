/**
 * <promo-banner-cart-form>
 *
 * Progressive enhancement for the promo banner "Add to cart" button.
 *
 * Without JavaScript (or when the theme uses the cart page instead of a
 * drawer/notification) the wrapped <form> posts to /cart/add and Shopify
 * redirects to the cart. With JavaScript the submit is intercepted, the
 * product is added through the Ajax Cart API and Dawn's cart drawer (or cart
 * notification) is re-rendered from the returned sections and opened.
 */
if (!customElements.get('promo-banner-cart-form')) {
  customElements.define(
    'promo-banner-cart-form',
    class PromoBannerCartForm extends HTMLElement {
      constructor() {
        super();
        this.handleSubmit = this.handleSubmit.bind(this);
      }

      connectedCallback() {
        this.form = this.querySelector('form');
        this.submitButton = this.querySelector('[type="submit"]');
        this.errorElement = this.querySelector('[data-promo-banner-error]');
        this.statusElement = this.querySelector('[data-promo-banner-status]');

        if (!this.form || !this.submitButton) return;

        if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');
        this.form.addEventListener('submit', this.handleSubmit);
      }

      disconnectedCallback() {
        this.form?.removeEventListener('submit', this.handleSubmit);
      }

      /** Dawn renders either a cart drawer or a cart notification, depending on the "Cart type" theme setting. */
      getCart() {
        const cart = document.querySelector('cart-drawer') || document.querySelector('cart-notification');
        return cart && typeof cart.renderContents === 'function' ? cart : null;
      }

      async handleSubmit(event) {
        const cart = this.getCart();

        // Cart type "Page": keep the native form submit, Shopify redirects to /cart.
        if (!cart) return;

        event.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.setError('');
        this.setLoading(true);

        const formData = new FormData(this.form);
        formData.append('sections', cart.getSectionsToRender().map((section) => section.id).join(','));
        formData.append('sections_url', window.location.pathname);
        if (typeof cart.setActiveElement === 'function') cart.setActiveElement(document.activeElement);

        try {
          const response = await fetch(`${this.form.getAttribute('action')}.js`, {
            method: 'POST',
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: formData,
          });
          const data = await response.json();

          if (!response.ok) {
            this.setError(data.description || data.message);
            this.notifyTheme('cartError', {
              source: 'promo-banner',
              productVariantId: formData.get('id'),
              errors: data.errors || data.description,
              message: data.message,
            });
            return;
          }

          this.notifyTheme('cartUpdate', {
            source: 'promo-banner',
            productVariantId: formData.get('id'),
            cartData: data,
          });
          cart.classList.remove('is-empty');
          cart.renderContents(data);
        } catch (error) {
          console.error(error);
          this.setError();
        } finally {
          this.setLoading(false);
        }
      }

      setLoading(isLoading) {
        this.submitButton.classList.toggle('is-loading', isLoading);

        if (isLoading) {
          this.submitButton.setAttribute('aria-disabled', 'true');
          this.submitButton.setAttribute('aria-busy', 'true');
        } else {
          this.submitButton.removeAttribute('aria-disabled');
          this.submitButton.removeAttribute('aria-busy');
        }

        if (this.statusElement) this.statusElement.textContent = isLoading ? this.dataset.loadingMessage : '';
      }

      /** Shows the message returned by Shopify, or the translated fallback; an empty string clears it. */
      setError(message = this.dataset.errorMessage) {
        if (!this.errorElement) return;
        this.errorElement.textContent = message || '';
      }

      /** Keeps Dawn's other cart components in sync through its pub/sub helpers, when available. */
      notifyTheme(eventName, data) {
        if (typeof publish !== 'function' || typeof PUB_SUB_EVENTS === 'undefined') return;
        publish(PUB_SUB_EVENTS[eventName], data);
      }
    }
  );
}
