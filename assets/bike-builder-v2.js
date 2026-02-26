import { Component } from '@theme/component';
import { CartAddEvent, ThemeEvents } from '@theme/events';
import { formatMoney } from '@theme/money-formatting';

class BikeBuilderV2Component extends Component {
  #currentStep = 0;
  #totalSteps = 0;
  #selectedVariantId = null;
  #selectedVariantPrice = 0;
  #selectedUpgrades = new Map(); // keyed by handle → { title, addon }
  #productData = {};
  #isSubmitting = false;

  connectedCallback() {
    super.connectedCallback();
    this.#readProductData();
    this.#selectedVariantId = this.#productData.currentVariantId;
    this.#selectedVariantPrice = this.#productData.currentVariantPrice || 0;

    // Listen for variant updates from the variant picker.
    // V2: variant change only updates price and variant ID — no morph needed
    // because upgrade categories are product-level, not variant-level.
    this.addEventListener(ThemeEvents.variantUpdate, this.#handleVariantUpdate.bind(this));

    this.goToStep(0);
  }

  #readProductData() {
    const dataEl = this.refs.productData;
    if (dataEl) {
      this.#productData = JSON.parse(dataEl.textContent);
    }
    this.#totalSteps = this.#productData.totalSteps || parseInt(this.dataset.totalSteps, 10) || 2;
  }

  goToStep(index) {
    if (index < 0 || index >= this.#totalSteps) return;

    this.#currentStep = index;
    const steps = this.refs.steps || [];

    for (const step of steps) {
      step.dataset.stepVisible = 'false';
    }
    if (steps[index]) {
      steps[index].dataset.stepVisible = 'true';
    }

    this.#updateProgress();
    this.#updateNav();

    if (index === this.#totalSteps - 1) {
      this.#updateReview();
    }

    const sidebar = this.querySelector('.bike-builder-v2__sidebar');
    if (sidebar) {
      sidebar.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  handleNext() {
    if (this.#currentStep < this.#totalSteps - 1) {
      this.goToStep(this.#currentStep + 1);
    }
  }

  handleBack() {
    if (this.#currentStep > 0) {
      this.goToStep(this.#currentStep - 1);
    }
  }

  /**
   * Handle upgrade card radio selection.
   * V2: stores addon (differential) price instead of absolute price.
   */
  handleUpgradeSelect(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    const handle = input.dataset.upgradeHandle;
    const title = input.dataset.upgradeTitle || '';
    const addon = parseInt(input.dataset.upgradeAddon, 10) || 0;

    if (!input.value) {
      // "Keep Stock" selected — remove from map
      this.#selectedUpgrades.delete(handle);
    } else {
      this.#selectedUpgrades.set(handle, { title, addon });
    }
  }

  /**
   * Add build to cart as a single line item with upgrade properties.
   * V2: one cart line with _build_version=v2 and _*_addon properties
   * for the Cart Transform Function to read.
   */
  async handleAddBuild() {
    if (this.#isSubmitting) return;
    if (!this.#selectedVariantId) return;

    this.#isSubmitting = true;
    const addButton = this.refs.addToCartButton;
    const errorEl = this.refs.cartError;

    if (addButton) {
      addButton.setAttribute('disabled', '');
      addButton.textContent = 'Adding...';
    }
    if (errorEl) {
      errorEl.hidden = true;
    }

    const buildId = `build-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const properties = {
      _build_version: 'v2',
      _build_id: buildId,
    };

    // Encode each upgrade category into properties
    const handles = this.#productData.upgradeHandles || [];
    for (const handle of handles) {
      const label = handle.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const upgrade = this.#selectedUpgrades.get(handle);
      if (upgrade) {
        // Visible to customer in cart/checkout
        properties[label] = upgrade.addon > 0
          ? `${upgrade.title} (+${this.#formatPrice(upgrade.addon)})`
          : upgrade.title;
        // Hidden — for Cart Transform Function
        properties[`_${handle}`] = upgrade.title;
        properties[`_${handle}_addon`] = String(upgrade.addon);
      } else {
        // Stock selected — record zero addon
        properties[label] = 'Stock';
        properties[`_${handle}`] = 'Stock';
        properties[`_${handle}_addon`] = '0';
      }
    }

    // Calculate addon total for visible Build Total property
    let addonTotal = 0;
    for (const handle of handles) {
      const upgrade = this.#selectedUpgrades.get(handle);
      if (upgrade) addonTotal += upgrade.addon;
    }
    if (addonTotal > 0) {
      properties['Build Total'] = this.#formatPrice(this.#selectedVariantPrice + addonTotal);
    }

    const items = [{
      id: this.#selectedVariantId,
      quantity: 1,
      properties,
    }];

    try {
      const response = await fetch(this.#productData.cartAddUrl || '/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.description || data.message || 'Could not add to cart');
      }

      const cart = await response.json();

      this.dispatchEvent(
        new CartAddEvent(cart, this.dataset.sectionId, {
          source: 'bike-builder-v2',
          itemCount: 1,
        })
      );
    } catch (error) {
      if (errorEl) {
        errorEl.textContent = error.message || 'Something went wrong. Please try again.';
        errorEl.hidden = false;
      }
    } finally {
      this.#isSubmitting = false;
      if (addButton) {
        addButton.removeAttribute('disabled');
        addButton.textContent = 'Add Build to Cart';
      }
    }
  }

  /**
   * Handle variant update from the variant picker.
   * V2 simplification: only update price and variant ID.
   * Upgrade categories are product-level so they don't change with variant.
   */
  #handleVariantUpdate(event) {
    const variant = event.detail?.resource;
    if (!variant) return;

    this.#selectedVariantId = variant.id;
    this.#selectedVariantPrice = variant.price || 0;

    const priceEl = this.refs.basePrice;
    if (priceEl) {
      priceEl.textContent = this.#formatPrice(variant.price);
    }
  }

  #updateProgress() {
    const progressSteps = this.querySelectorAll('.bike-builder-v2__progress-step');
    const progressLines = this.querySelectorAll('.bike-builder-v2__progress-line');

    progressSteps.forEach((step, i) => {
      step.dataset.active = i === this.#currentStep ? 'true' : 'false';
      step.dataset.completed = i < this.#currentStep ? 'true' : 'false';
    });

    progressLines.forEach((line, i) => {
      line.dataset.completed = i < this.#currentStep ? 'true' : 'false';
    });

    const activeStep = progressSteps[this.#currentStep];
    if (activeStep) {
      activeStep.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  #updateNav() {
    const backBtn = this.refs.backButton;
    const nextBtn = this.refs.nextButton;
    const isFirstStep = this.#currentStep === 0;
    const isLastStep = this.#currentStep === this.#totalSteps - 1;

    if (backBtn) {
      backBtn.hidden = isFirstStep;
    }

    if (nextBtn) {
      nextBtn.hidden = isLastStep;
      if (!isLastStep) {
        const nextStepName = this.#productData.stepNames?.[this.#currentStep + 1] || 'Next';
        nextBtn.textContent = this.#currentStep === this.#totalSteps - 2
          ? 'Review Build'
          : `Next: ${nextStepName}`;
      }
    }
  }

  /**
   * Populate review step with base price + addon totals.
   * V2: simple addition — total = base + sum(addons). No subtraction needed.
   */
  #updateReview() {
    const reviewBasePrice = this.refs.reviewBasePrice;
    const reviewUpgrades = this.refs.reviewUpgrades;
    const reviewTotal = this.refs.reviewTotal;

    if (reviewBasePrice) {
      reviewBasePrice.textContent = this.#formatPrice(this.#selectedVariantPrice);
    }

    if (reviewUpgrades) {
      while (reviewUpgrades.firstChild) {
        reviewUpgrades.removeChild(reviewUpgrades.firstChild);
      }

      let addonTotal = 0;
      const handles = this.#productData.upgradeHandles || [];

      // Show all categories — upgraded ones with addon price, stock ones as "Included"
      for (const handle of handles) {
        const upgrade = this.#selectedUpgrades.get(handle);
        const title = upgrade ? upgrade.title : 'Stock';
        const addon = upgrade ? upgrade.addon : 0;
        addonTotal += addon;

        const item = document.createElement('div');
        item.className = 'bike-builder-v2__review-item';

        const label = document.createElement('span');
        label.className = 'bike-builder-v2__review-label';
        label.textContent = handle.replace(/_/g, ' ');

        const value = document.createElement('span');
        value.className = 'bike-builder-v2__review-value';
        value.textContent = title;

        const price = document.createElement('span');
        price.className = 'bike-builder-v2__review-price';
        price.textContent = addon > 0
          ? `+ ${this.#formatPrice(addon)}`
          : 'Included';

        item.append(label, value, price);
        reviewUpgrades.appendChild(item);
      }

      if (reviewTotal) {
        reviewTotal.textContent = this.#formatPrice(this.#selectedVariantPrice + addonTotal);
      }
    }
  }

  #formatPrice(cents) {
    const format = this.#productData.moneyFormat || '${{amount}}';
    const currency = this.#productData.currency || 'USD';
    return formatMoney(cents, format, currency);
  }
}

if (!customElements.get('bike-builder-v2-component')) {
  customElements.define('bike-builder-v2-component', BikeBuilderV2Component);
}
