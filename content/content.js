// Indeed Autofiller - Content Script
// Handles form detection and autofilling on Indeed application pages

(function () {
  'use strict';

  // Field mappings: label text patterns -> settings key
  const FIELD_MAPPINGS = {
    // Contact Information
    'cell phone': { key: 'phone', type: 'text' },
    'phone': { key: 'phone', type: 'text' },
    'address': { key: 'address', type: 'text' },
    'city': { key: 'city', type: 'text' },
    'state': { key: 'state', type: 'select' },
    'postal code': { key: 'zipCode', type: 'text' },
    'zip code': { key: 'zipCode', type: 'text' },
    'zip': { key: 'zipCode', type: 'text' },

    // Application Questions
    'security clearance': { key: 'securityClearance', type: 'radio' },
    'background check': { key: 'backgroundCheck', type: 'radio' },
    'eligible to pass a background': { key: 'backgroundCheck', type: 'radio' },

    // Demographics
    'gender': { key: 'gender', type: 'radio', demographic: true },
    'ethnicity': { key: 'ethnicity', type: 'select', demographic: true },
    'race': { key: 'ethnicity', type: 'select', demographic: true },

    // Veteran Status
    'veteran': { key: 'veteranStatus', type: 'radio', demographic: true },
    'vevraa': { key: 'veteranStatus', type: 'radio', demographic: true },

    // Disability
    'disability': { key: 'disabilityStatus', type: 'radio', demographic: true },
    'form cc-305': { key: 'disabilityStatus', type: 'radio', demographic: true },

    // Signature fields
    'your name': { key: 'fullName', type: 'text', demographic: true },
    "today's date": { key: 'autoDate', type: 'date', demographic: true },
    'date': { key: 'autoDate', type: 'date', demographic: true }
  };

  // Listen for messages from popup or background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'autofill') {
      performAutofill();
      sendResponse({ success: true });
    }
    return true;
  });

  // Check for auto-fill on page load
  async function checkAutoFill() {
    try {
      const settings = await chrome.storage.sync.get(['autoFillOnLoad']);
      if (settings.autoFillOnLoad) {
        // Wait for page to fully load
        setTimeout(performAutofill, 1000);
      }
    } catch (error) {
      console.error('Indeed Autofiller: Error checking auto-fill setting', error);
    }
  }

  // Main autofill function
  async function performAutofill() {
    console.log('Indeed Autofiller: Starting autofill...');

    try {
      const settings = await chrome.storage.sync.get(null);
      let filledCount = 0;

      // Find all question items on the page
      const questionItems = document.querySelectorAll('.ia-Questions-item, [class*="Questions-item"]');

      questionItems.forEach(item => {
        const filled = processQuestionItem(item, settings);
        if (filled) filledCount++;
      });

      // Also try direct field detection for pages without question item wrappers
      filledCount += fillDirectFields(settings);

      // Handle text opt-in checkbox
      if (settings.textOptIn === 'yes') {
        fillTextOptIn();
      }

      // Handle privacy policy
      if (settings.privacyPolicy === 'yes') {
        fillPrivacyPolicy();
      }

      console.log(`Indeed Autofiller: Filled ${filledCount} fields`);

      // Show notification if enabled
      if (settings.showNotification !== false) {
        showNotification(filledCount);
      }
    } catch (error) {
      console.error('Indeed Autofiller: Error during autofill', error);
    }
  }

  // Process a single question item
  function processQuestionItem(item, settings) {
    // Find the label text
    const labelEl = item.querySelector('[data-testid*="-label"] [data-testid="safe-markup"]') ||
      item.querySelector('label [data-testid="safe-markup"]') ||
      item.querySelector('label') ||
      item.querySelector('legend');

    if (!labelEl) return false;

    const labelText = labelEl.textContent.toLowerCase().trim();

    // Find matching field mapping
    for (const [pattern, config] of Object.entries(FIELD_MAPPINGS)) {
      if (labelText.includes(pattern)) {
        // Skip demographics if not enabled
        if (config.demographic && !settings.fillDemographics) {
          continue;
        }

        const value = config.key === 'autoDate'
          ? (settings.autoFillDate !== false ? getTodayDate() : null)
          : settings[config.key];

        if (!value) continue;

        return fillField(item, config.type, value);
      }
    }

    return false;
  }

  // Fill a field based on its type
  function fillField(container, type, value) {
    try {
      switch (type) {
        case 'text':
          return fillTextField(container, value);
        case 'select':
          return fillSelectField(container, value);
        case 'radio':
          return fillRadioField(container, value);
        case 'date':
          return fillDateField(container, value);
        default:
          return false;
      }
    } catch (error) {
      console.error('Indeed Autofiller: Error filling field', error);
      return false;
    }
  }

  // Fill text input field
  function fillTextField(container, value) {
    const input = container.querySelector('input[type="text"], input:not([type])');
    if (!input || input.value) return false; // Don't overwrite existing values

    setInputValue(input, value);
    return true;
  }

  // Fill select dropdown
  function fillSelectField(container, value) {
    const select = container.querySelector('select');
    if (!select) return false;

    // Try to find option by value or label
    const options = Array.from(select.options);
    const option = options.find(opt =>
      opt.value === value ||
      opt.value.toUpperCase() === value.toUpperCase() ||
      opt.label?.toLowerCase().includes(value.toLowerCase())
    );

    if (option) {
      select.value = option.value;
      triggerEvents(select);
      return true;
    }

    return false;
  }

  // Fill radio button
  function fillRadioField(container, value) {
    const radios = container.querySelectorAll('input[type="radio"]');
    if (!radios.length) return false;

    for (const radio of radios) {
      const radioValue = radio.value.toLowerCase();
      const labelEl = container.querySelector(`label[for="${radio.id}"]`);
      const labelText = labelEl?.textContent?.toLowerCase() || '';

      // Match by value or label text
      if (radioValue === value.toLowerCase() ||
        labelText.includes(value.toLowerCase()) ||
        (value === 'Yes' && (radioValue === 'yes' || labelText.includes('yes'))) ||
        (value === 'No' && (radioValue === 'no' || labelText.includes('no')))) {
        radio.checked = true;
        triggerEvents(radio);
        return true;
      }
    }

    // Try matching by numeric value for demographic fields
    for (const radio of radios) {
      if (radio.value === value) {
        radio.checked = true;
        triggerEvents(radio);
        return true;
      }
    }

    return false;
  }

  // Fill date input
  function fillDateField(container, value) {
    const input = container.querySelector('input[placeholder*="MM/DD"], input[name*="date" i], input[id*="date" i]');
    if (!input || input.value) return false;

    setInputValue(input, value);
    return true;
  }

  // Direct field detection for pages without question wrappers
  function fillDirectFields(settings) {
    let count = 0;

    // Try to fill by input name patterns
    const inputs = document.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
      const name = input.name?.toLowerCase() || '';
      const id = input.id?.toLowerCase() || '';

      // Phone
      if ((name.includes('phone') || id.includes('phone')) && settings.phone && !input.value) {
        setInputValue(input, settings.phone);
        count++;
      }

      // Address
      if ((name.includes('address') || id.includes('address')) && settings.address && !input.value) {
        setInputValue(input, settings.address);
        count++;
      }

      // City
      if ((name.includes('city') || id.includes('city')) && settings.city && !input.value) {
        setInputValue(input, settings.city);
        count++;
      }

      // State
      if ((name.includes('state') || id.includes('state')) && input.tagName === 'SELECT' && settings.state) {
        if (fillSelectField(input.parentElement, settings.state)) count++;
      }

      // Zip/Postal
      if ((name.includes('zip') || name.includes('postal') || id.includes('zip') || id.includes('postal')) &&
        settings.zipCode && !input.value) {
        setInputValue(input, settings.zipCode);
        count++;
      }

      // Full name for signatures
      if (settings.fillDemographics && settings.fullName) {
        if ((name.includes('yourname') || name.includes('your_name') || id.includes('yourname')) && !input.value) {
          setInputValue(input, settings.fullName);
          count++;
        }
      }

      // Today's date
      if (settings.autoFillDate !== false) {
        if ((name.includes('todaydate') || name.includes('today_date') || id.includes('todaydate')) && !input.value) {
          setInputValue(input, getTodayDate());
          count++;
        }
      }
    });

    return count;
  }

  // Fill text opt-in checkbox
  function fillTextOptIn() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      const label = document.querySelector(`label[for="${checkbox.id}"]`);
      const labelText = label?.textContent?.toLowerCase() || '';

      if (labelText.includes('text message') || labelText.includes('receive text')) {
        checkbox.checked = true;
        triggerEvents(checkbox);
      }
    });
  }

  // Fill privacy policy acknowledgement
  function fillPrivacyPolicy() {
    const radios = document.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
      const label = document.querySelector(`label[for="${radio.id}"]`);
      const labelText = label?.textContent?.toLowerCase() || '';

      if (labelText.includes('read and agree') || labelText.includes('acknowledge and consent')) {
        radio.checked = true;
        triggerEvents(radio);
      }
    });
  }

  // Helper: Set input value and trigger events
  function setInputValue(input, value) {
    // Use native setter to work with React
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, value);
    } else {
      input.value = value;
    }

    triggerEvents(input);
  }

  // Helper: Trigger input events for React compatibility
  function triggerEvents(element) {
    const events = ['input', 'change', 'blur'];
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
    });
  }

  // Helper: Get today's date in MM/DD/YYYY format
  function getTodayDate() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const year = today.getFullYear();
    return `${month}/${day}/${year}`;
  }

  // Show notification on page
  function showNotification(count) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = `Indeed Autofiller: Filled ${count} field${count !== 1 ? 's' : ''}`;

    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAutoFill);
  } else {
    checkAutoFill();
  }

  // Also check when URL changes (Indeed uses client-side navigation)
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(checkAutoFill, 1000);
    }
  }).observe(document.body, { subtree: true, childList: true });

  console.log('Indeed Autofiller: Content script loaded');
})();
