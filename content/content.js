// Indeed Autofiller - Content Script
// Handles form detection and autofilling on Indeed application pages

(function () {
  'use strict';

  // Field mappings: label text patterns -> settings key
  const FIELD_MAPPINGS = {
    // Contact Information
    'cell phone': { key: 'phone', type: 'text' },
    'phone': { key: 'phone', type: 'text' },
    'street address': { key: 'address', type: 'text' },
    'address': { key: 'address', type: 'text' },
    'city, state': { key: 'cityState', type: 'combobox' },
    'city': { key: 'city', type: 'text' },
    'state': { key: 'state', type: 'select' },
    'postal code': { key: 'zipCode', type: 'text' },
    'zip code': { key: 'zipCode', type: 'text' },
    'zip': { key: 'zipCode', type: 'text' },

    // Application Questions
    'security clearance': { key: 'securityClearance', type: 'radio' },
    'background check': { key: 'backgroundCheck', type: 'radio' },
    'eligible to pass a background': { key: 'backgroundCheck', type: 'radio' },

    // Work Authorization
    'authorized to work': { key: 'authorizedToWork', type: 'radio' },
    'legally authorized': { key: 'authorizedToWork', type: 'radio' },
    'work lawfully': { key: 'authorizedToWork', type: 'radio' },
    'require sponsorship': { key: 'requireSponsorship', type: 'radio' },
    'will you now or in the future require sponsorship': { key: 'requireSponsorship', type: 'radio' },

    // Age Verification
    'over the age of 18': { key: 'overAge18', type: 'radio' },
    'at least 18': { key: 'overAge18', type: 'radio' },
    'are you 18': { key: 'overAge18', type: 'radio' },

    // Currently Employed Questions (auto-answer No)
    'currently employed with': { key: 'currentlyEmployed', type: 'radio' },
    'are you currently employed': { key: 'currentlyEmployed', type: 'radio' },

    // Referral Questions (auto-answer No)
    'referred by': { key: 'referralQuestion', type: 'radio' },
    'were you referred': { key: 'referralQuestion', type: 'radio' },
    'who referred you': { key: 'referralName', type: 'text' },
    'if so, who referred you': { key: 'referralName', type: 'text' },

    // SMS/Text Consent (auto-answer Yes)
    'sms consent': { key: 'smsConsent', type: 'radio' },
    'text message consent': { key: 'smsConsent', type: 'radio' },

    // Acknowledgment Questions (auto-answer Yes)
    'acknowledge your understanding': { key: 'acknowledgmentQuestion', type: 'radio' },
    'please acknowledge': { key: 'acknowledgmentQuestion', type: 'radio' },
    'acknowledge and agree': { key: 'acknowledgmentQuestion', type: 'radio' },
    'required to work onsite': { key: 'acknowledgmentQuestion', type: 'radio' },

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

      // Check if we're on the resume selection page and should auto-continue
      if (settings.autoClickResumeContinue) {
        const resumePageContinued = handleResumePageContinue();
        if (resumePageContinued) {
          console.log('Indeed Autofiller: Clicked continue on resume page');
          return; // Page will navigate, no need to continue
        }
      }

      // Check if we're on the job experience page
      const experienceFilled = handleJobExperiencePage(settings);
      if (experienceFilled) {
        filledCount += experienceFilled;
      }

      // Check if we're on the success page and should auto-close
      if (settings.autoCloseAfterSubmit) {
        const successPageClosed = handleSuccessPageClose();
        if (successPageClosed) {
          console.log('Indeed Autofiller: Closed tab after successful submission');
          return; // Tab will close
        }
      }

      // Check if we're on the review page and should auto-submit
      if (settings.autoSubmitReview) {
        const reviewPageSubmitted = handleReviewPageSubmit();
        if (reviewPageSubmitted) {
          console.log('Indeed Autofiller: Submitted application on review page');
          return; // Page will navigate
        }
      }

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

      // Show notification if enabled and fields were filled
      if (settings.showNotification !== false && filledCount > 0) {
        showNotification(filledCount);
      }
    } catch (error) {
      console.error('Indeed Autofiller: Error during autofill', error);
    }
  }

  // Handle resume page auto-continue
  function handleResumePageContinue() {
    // Check if we're on a resume selection page
    const resumeForm = document.querySelector('[data-testid="resume-selection-form"]');
    if (!resumeForm) return false;

    // Check if a resume is already selected
    const selectedResume = resumeForm.querySelector('input[type="radio"][checked], input[type="radio"]:checked');
    if (!selectedResume) return false;

    // Find and click the continue button
    const continueBtn = resumeForm.querySelector('[data-testid="continue-button"]');
    if (continueBtn) {
      continueBtn.click();
      return true;
    }

    return false;
  }

  // Handle job experience page (Job Title and Company)
  function handleJobExperiencePage(settings) {
    let count = 0;

    // Check for job title input
    const jobTitleInput = document.querySelector('[data-testid="job-title-input"], input[name="jobTitle"], #job-title-input');
    if (jobTitleInput && settings.jobTitle && !jobTitleInput.value) {
      setInputValue(jobTitleInput, settings.jobTitle);
      count++;
    }

    // Check for company name input
    const companyInput = document.querySelector('[data-testid="company-name-input"], input[name="companyName"], #company-name-input');
    if (companyInput && settings.companyName && !companyInput.value) {
      setInputValue(companyInput, settings.companyName);
      count++;
    }

    // If we filled fields and auto-continue is enabled, click the continue button
    if (count > 0 && settings.autoClickResumeContinue) {
      const continueBtn = document.querySelector('[data-testid="continue-button"]');
      if (continueBtn) {
        console.log('Indeed Autofiller: Clicking continue button after filling job experience');
        // Add a small delay to ensure the form processes the input
        setTimeout(() => {
          continueBtn.click();
        }, 500);
      }
    }

    return count;
  }

  // Handle success page auto-close
  function handleSuccessPageClose() {
    // Check if we're on a success/confirmation page
    // Look for common success indicators
    const successIndicators = [
      'application submitted',
      'application complete',
      'thank you for applying',
      'your application has been submitted',
      'successfully submitted',
      'application received'
    ];

    const pageText = document.body.textContent.toLowerCase();
    const hasSuccessMessage = successIndicators.some(indicator => pageText.includes(indicator));

    // Also check for success page URL patterns
    const urlIndicatesSuccess = window.location.href.includes('confirmation') ||
      window.location.href.includes('success') ||
      window.location.href.includes('submitted');

    if (hasSuccessMessage || urlIndicatesSuccess) {
      // Close the tab after a short delay to allow user to see the success message
      setTimeout(() => {
        window.close();
      }, 2000);
      return true;
    }

    return false;
  }

  // Handle review page auto-submit
  function handleReviewPageSubmit() {
    // Check if we're on a review page
    const reviewHeading = document.querySelector('h1');
    if (!reviewHeading || !reviewHeading.textContent.toLowerCase().includes('review your application')) {
      return false;
    }

    // Also check for the preview module
    const previewModule = document.querySelector('#mosaic-provider-module-apply-preview, [id*="preview"]');
    if (!previewModule) return false;

    // Find and click the submit button - try multiple selectors
    const submitBtn = document.querySelector('[data-testid="submit-application-button"]') ||
      document.querySelector('button[name="submit-application"]') ||
      document.querySelector('button[type="submit"][data-testid*="submit"]');

    if (submitBtn && submitBtn.textContent.toLowerCase().includes('submit')) {
      console.log('Indeed Autofiller: Clicking submit button on review page');
      submitBtn.click();
      return true;
    }

    return false;
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

        let value;

        // Handle special cases with hardcoded values
        if (config.key === 'requireSponsorship') {
          value = 'No'; // Always answer No for sponsorship requirement
        } else if (config.key === 'smsConsent') {
          value = 'Yes'; // Always answer Yes for SMS consent
        } else if (config.key === 'referralName') {
          value = 'N/A'; // Always answer N/A for referral name
        } else if (config.key === 'autoDate') {
          value = settings.autoFillDate !== false ? getTodayDate() : null;
        } else {
          value = settings[config.key];
        }

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
        case 'combobox':
          return fillComboboxField(container, value);
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

    // Map numeric ethnicity values to text alternatives
    // Values based on Indeed's demographic question format
    const ethnicityMap = {
      '1': ['american indian', 'alaska native', 'alaskan native'],
      '2': 'asian',
      '4': ['black', 'african american'],
      '8': ['hispanic', 'latino'],
      '16': 'white',
      '32': ['native hawaiian', 'pacific islander'],
      '64': ['two or more', 'two or more races'],
      '128': ['decline', 'do not wish', 'not specified', 'prefer not']
    };

    // Try to find option by value or label
    const options = Array.from(select.options);
    let option = options.find(opt =>
      opt.value === value ||
      opt.value.toUpperCase() === value.toUpperCase() ||
      opt.label?.toLowerCase().includes(value.toLowerCase())
    );

    // If no match and value is numeric, try ethnicity mapping
    if (!option && ethnicityMap[value]) {
      const matches = Array.isArray(ethnicityMap[value]) ? ethnicityMap[value] : [ethnicityMap[value]];
      option = options.find(opt =>
        matches.some(m => opt.label?.toLowerCase().includes(m) || opt.text?.toLowerCase().includes(m))
      );
    }

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

    // Map numeric demographic values to text alternatives
    const genderMap = { '1': 'male', '2': 'female', '3': ['decline', 'undeclared', 'other'] };
    const veteranMap = { '51': 'protected veteran', '52': 'not a protected veteran', '53': ['do not wish', 'undeclared'] };
    const disabilityMap = { '1': ['yes', 'have a disability'], '2': ['no', 'do not have'], '3': ['do not want', 'undeclared'] };

    for (const radio of radios) {
      const radioValue = radio.value.toLowerCase();
      const labelEl = container.querySelector(`label[for="${radio.id}"]`);
      const labelText = labelEl?.textContent?.toLowerCase().trim() || '';

      // Direct match by value or label text
      if (radioValue === value.toLowerCase() ||
        labelText.includes(value.toLowerCase()) ||
        (value === 'Yes' && (radioValue === 'yes' || labelText.includes('yes'))) ||
        (value === 'No' && (radioValue === 'no' || labelText.includes('no')))) {
        radio.checked = true;
        triggerEvents(radio);
        return true;
      }

      // Try gender mapping (numeric to text)
      if (genderMap[value]) {
        const matches = Array.isArray(genderMap[value]) ? genderMap[value] : [genderMap[value]];
        if (matches.some(m => labelText.includes(m))) {
          radio.checked = true;
          triggerEvents(radio);
          return true;
        }
      }

      // Try veteran mapping (numeric to text)
      if (veteranMap[value]) {
        const matches = Array.isArray(veteranMap[value]) ? veteranMap[value] : [veteranMap[value]];
        if (matches.some(m => labelText.includes(m))) {
          radio.checked = true;
          triggerEvents(radio);
          return true;
        }
      }

      // Try disability mapping (numeric to text)
      if (disabilityMap[value]) {
        const matches = Array.isArray(disabilityMap[value]) ? disabilityMap[value] : [disabilityMap[value]];
        if (matches.some(m => labelText.includes(m))) {
          radio.checked = true;
          triggerEvents(radio);
          return true;
        }
      }
    }

    // Try matching by exact numeric value for demographic fields
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

  // Fill combobox/autocomplete field (like City, State)
  function fillComboboxField(container, value) {
    const input = container.querySelector('input[role="combobox"], input[data-testid*="locality"]');
    if (!input || input.value) return false;

    setInputValue(input, value);

    // Trigger additional events for autocomplete to work
    input.focus();
    const inputEvent = new InputEvent('input', { bubbles: true, data: value });
    input.dispatchEvent(inputEvent);

    // Give autocomplete time to show suggestions, then blur to accept
    setTimeout(() => {
      input.blur();
    }, 100);

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
      const testId = input.getAttribute('data-testid')?.toLowerCase() || '';

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

      // City, State combined field (combobox)
      if ((name.includes('locality') || id.includes('locality') || testId.includes('locality')) &&
        settings.cityState && !input.value) {
        setInputValue(input, settings.cityState);
        count++;
      }

      // City
      if ((name.includes('city') || id.includes('city')) && !name.includes('locality') &&
        settings.city && !input.value) {
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
