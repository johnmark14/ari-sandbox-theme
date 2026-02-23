import { Component } from '@theme/component';
import { CartAddEvent, ThemeEvents } from '@theme/events';
import { formatMoney } from '@theme/money-formatting';

class BikeBuilderComponent extends Component {
  #currentStep = 0;
  #totalSteps = 0;
  #selectedVariantId = null;
  #selectedVariantPrice = 0;
  #selectedUpgrades = new Map(); // keyed by handle string (e.g., "bike_wheelset")
  #productData = {};
  #isSubmitting = false;

  connectedCallback() {
    super.connectedCallback();
    this.#readProductData();
    this.#selectedVariantId = this.#productData.currentVariantId;
    this.#selectedVariantPrice = this.#productData.currentVariantPrice || 0;

    // Listen for variant updates from the variant picker
    this.addEventListener(ThemeEvents.variantUpdate, this.#handleVariantUpdate.bind(this));

    this.goToStep(0);
  }

  /**
   * Read product data from the embedded JSON script element.
   * Called on init and after morph to refresh totalSteps/stepNames.
   */
  #readProductData() {
    const dataEl = this.refs.productData;
    if (dataEl) {
      this.#productData = JSON.parse(dataEl.textContent);
    }
    this.#totalSteps = this.#productData.totalSteps || parseInt(this.dataset.totalSteps, 10) || 2;
  }

  /**
   * Navigate to a specific step
   * @param {number} index
   */
  goToStep(index) {
    if (index < 0 || index >= this.#totalSteps) return;

    this.#currentStep = index;
    const steps = this.refs.steps || [];

    // Hide all steps, show target
    for (const step of steps) {
      step.dataset.stepVisible = 'false';
    }
    if (steps[index]) {
      steps[index].dataset.stepVisible = 'true';
    }

    // Update progress
    this.#updateProgress();

    // Update navigation buttons
    this.#updateNav();

    // If we're on the review step, populate it
    if (index === this.#totalSteps - 1) {
      this.#updateReview();
    }

    // Scroll sidebar to top on step change
    const sidebar = this.querySelector('.bike-builder__sidebar');
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
   * Handle upgrade card radio selection
   * @param {Event} event
   */
  handleUpgradeSelect(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    const handle = input.dataset.upgradeHandle;
    const variantId = input.value;
    const title = input.dataset.upgradeTitle || '';
    const price = parseInt(input.dataset.upgradePrice, 10) || 0;

    if (!variantId) {
      // "Keep Stock" selected - remove from map
      this.#selectedUpgrades.delete(handle);
    } else {
      this.#selectedUpgrades.set(handle, { variantId, title, price });
    }
  }

  /**
   * Handle add build to cart
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
    const items = [];

    if (this.#selectedUpgrades.size === 0) {
      // No upgrades selected — add base bike only
      items.push({
        id: this.#selectedVariantId,
        quantity: 1,
      });
    } else {
      // Only add bundle/upgrade variants (they already include the base bike)
      for (const [handle, upgrade] of this.#selectedUpgrades) {
        items.push({
          id: parseInt(upgrade.variantId, 10),
          quantity: 1,
          properties: {
            _build_id: buildId,
            _build_category: handle,
            _build_upgrade_name: upgrade.title,
          },
        });
      }
    }

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

      // Dispatch cart event to open cart drawer
      this.dispatchEvent(
        new CartAddEvent(cart, this.dataset.sectionId, {
          source: 'bike-builder',
          itemCount: items.length,
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
   * Handle variant update events from the variant picker.
   * Updates price and re-renders upgrade steps when variant changes.
   * @param {Event} event
   */
  #handleVariantUpdate(event) {
    const variant = event.detail?.resource;
    if (!variant) return;

    this.#selectedVariantId = variant.id;
    this.#selectedVariantPrice = variant.price || 0;

    // Update displayed price
    const priceEl = this.refs.basePrice;
    if (priceEl) {
      priceEl.textContent = this.#formatPrice(variant.price);
    }

    // Re-render upgrade steps if full HTML is available
    const html = event.detail?.data?.html;
    if (html) {
      this.#morphUpgradeSteps(html);
    }
  }

  /**
   * Replace upgrade steps, progress bar, and product data from a full-page
   * response Document. Called when the base variant changes so that
   * upgrade categories reflect the new variant's metafields.
   * @param {Document} responseDoc - Parsed HTML document from section rendering response
   */
  #morphUpgradeSteps(responseDoc) {
    const newComponent = responseDoc.querySelector('bike-builder-component');
    if (!newComponent) return;

    // Replace upgrade steps container
    const newStepsContainer = newComponent.querySelector('[ref="upgradeStepsContainer"]');
    const currentStepsContainer = this.refs.upgradeStepsContainer;
    if (newStepsContainer && currentStepsContainer) {
      while (currentStepsContainer.firstChild) {
        currentStepsContainer.removeChild(currentStepsContainer.firstChild);
      }
      while (newStepsContainer.firstChild) {
        currentStepsContainer.appendChild(newStepsContainer.firstChild);
      }
    }

    // Replace progress bar children
    const newProgress = newComponent.querySelector('[ref="progress"]');
    const currentProgress = this.refs.progress;
    if (newProgress && currentProgress) {
      while (currentProgress.firstChild) {
        currentProgress.removeChild(currentProgress.firstChild);
      }
      while (newProgress.firstChild) {
        currentProgress.appendChild(newProgress.firstChild);
      }
    }

    // Update productData script
    const newDataEl = newComponent.querySelector('[ref="productData"]');
    const currentDataEl = this.refs.productData;
    if (newDataEl && currentDataEl) {
      currentDataEl.textContent = newDataEl.textContent;
    }

    // Re-scan refs and re-read product data
    this.updatedCallback();
    this.#readProductData();

    // Clear previous variant's upgrade selections (they're now invalid)
    this.#selectedUpgrades.clear();

    // Navigate back to step 0
    this.goToStep(0);
  }

  #updateProgress() {
    const progressSteps = this.querySelectorAll('.bike-builder__progress-step');
    const progressLines = this.querySelectorAll('.bike-builder__progress-line');

    progressSteps.forEach((step, i) => {
      step.dataset.active = i === this.#currentStep ? 'true' : 'false';
      step.dataset.completed = i < this.#currentStep ? 'true' : 'false';
    });

    progressLines.forEach((line, i) => {
      line.dataset.completed = i < this.#currentStep ? 'true' : 'false';
    });

    // Scroll active step into view in progress bar
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

  #updateReview() {
    const reviewBasePrice = this.refs.reviewBasePrice;
    const reviewUpgrades = this.refs.reviewUpgrades;
    const reviewTotal = this.refs.reviewTotal;

    // Update base bike price
    if (reviewBasePrice) {
      reviewBasePrice.textContent = this.#formatPrice(this.#selectedVariantPrice);
    }

    // Build upgrade summary using safe DOM methods
    if (reviewUpgrades) {
      // Clear existing content
      while (reviewUpgrades.firstChild) {
        reviewUpgrades.removeChild(reviewUpgrades.firstChild);
      }

      let upgradeTotal = 0;

      for (const [handle, upgrade] of this.#selectedUpgrades) {
        upgradeTotal += upgrade.price - this.#selectedVariantPrice;

        const item = document.createElement('div');
        item.className = 'bike-builder__review-item';

        const label = document.createElement('span');
        label.className = 'bike-builder__review-label';
        label.textContent = handle.replace('bike_', '').replace(/_/g, ' ');

        const value = document.createElement('span');
        value.className = 'bike-builder__review-value';
        value.textContent = upgrade.title;

        const price = document.createElement('span');
        price.className = 'bike-builder__review-price';
        price.textContent = `+ ${this.#formatPrice(upgrade.price - this.#selectedVariantPrice)}`;

        item.append(label, value, price);
        reviewUpgrades.appendChild(item);
      }

      // Update total
      if (reviewTotal) {
        reviewTotal.textContent = this.#formatPrice(this.#selectedVariantPrice + upgradeTotal);
      }
    }
  }

  /**
   * Format a price in minor units using the shop's money format
   * @param {number} cents
   * @returns {string}
   */
  #formatPrice(cents) {
    const format = this.#productData.moneyFormat || '${{amount}}';
    const currency = this.#productData.currency || 'USD';
    return formatMoney(cents, format, currency);
  }
}

if (!customElements.get('bike-builder-component')) {
  customElements.define('bike-builder-component', BikeBuilderComponent);
}
