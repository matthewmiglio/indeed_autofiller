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

    // Profile Links
    'linkedin': { key: 'linkedinUrl', type: 'text' },
    'linkedin profile': { key: 'linkedinUrl', type: 'text' },
    'github': { key: 'githubUrl', type: 'text' },
    'github repo': { key: 'githubUrl', type: 'text' },
    'github profile': { key: 'githubUrl', type: 'text' },

    // How did you hear about this job/position (auto-answer "Indeed")
    'how did you hear': { key: 'howDidYouHear', type: 'howDidYouHearSelect' },
    'how did you find': { key: 'howDidYouHear', type: 'howDidYouHearSelect' },
    'where did you hear': { key: 'howDidYouHear', type: 'howDidYouHearSelect' },
    'how did you hear about this position': { key: 'howDidYouHear', type: 'howDidYouHearSelect' },

    // Zip code questions
    'what is your zip code': { key: 'zipCode', type: 'text' },
    'if in the united states, what is your zip code': { key: 'zipCode', type: 'text' },

    // Country selection (dropdown or text)
    'select country': { key: 'country', type: 'countrySelect' },
    'country': { key: 'country', type: 'countryText' },

    // State as text input (some forms use text instead of dropdown)
    'state': { key: 'state', type: 'stateText' },

    // Middle Name
    'middle name': { key: 'middleName', type: 'text' },

    // Source dropdown (variant of "how did you hear")
    'source': { key: 'howDidYouHear', type: 'howDidYouHearSelect' },

    // DoD Security Clearance Level
    'dod security clearance': { key: 'securityClearanceLevel', type: 'securityClearanceSelect' },
    'security clearance level': { key: 'securityClearanceLevel', type: 'securityClearanceSelect' },

    // Degree Major
    'degree major': { key: 'degreeMajor', type: 'text' },

    // Application Questions
    'security clearance': { key: 'securityClearance', type: 'radio' },
    'background check': { key: 'backgroundCheck', type: 'radio' },
    'eligible to pass a background': { key: 'backgroundCheck', type: 'radio' },

    // Work Authorization
    'authorized to work': { key: 'authorizedToWork', type: 'radio' },
    'legally authorized': { key: 'authorizedToWork', type: 'radio' },
    'work lawfully': { key: 'authorizedToWork', type: 'radio' },
    'require sponsorship': { key: 'requireSponsorship', type: 'radio' },
    'will you now or in the future require': { key: 'requireSponsorship', type: 'radio' },
    'uscis immigration case': { key: 'requireSponsorship', type: 'radio' },
    'employment-based immigration': { key: 'requireSponsorship', type: 'radio' },
    'h-1b or other': { key: 'requireSponsorship', type: 'radio' },

    // Age Verification
    'over the age of 18': { key: 'overAge18', type: 'radio' },
    'at least 18': { key: 'overAge18', type: 'radio' },
    'are you 18': { key: 'overAge18', type: 'radio' },

    // Education Level
    'highest level of education': { key: 'educationLevel', type: 'educationAuto' },
    'level of completed education': { key: 'educationLevel', type: 'educationAuto' },
    'highest level of completed education': { key: 'educationLevel', type: 'educationAuto' },

    // Previously Employed by Company (always No)
    'have you ever been employed by this company': { key: 'previouslyEmployed', type: 'radio', fixedValue: 'No' },
    'employed by this company': { key: 'previouslyEmployed', type: 'radio', fixedValue: 'No' },
    'ever been employed by': { key: 'previouslyEmployed', type: 'radio', fixedValue: 'No' },
    'have you ever worked at': { key: 'previouslyEmployed', type: 'radio', fixedValue: 'No' },

    // Currently Attending/Associated with Company (always No)
    'currently attending a': { key: 'currentlyAttending', type: 'radio', fixedValue: 'No' },
    'are you currently attending': { key: 'currentlyAttending', type: 'radio', fixedValue: 'No' },

    // Work Setting Preference (always No preference)
    'preferred work setting': { key: 'workSettingPreference', type: 'workSetting', fixedValue: 'no preference' },
    'work setting': { key: 'workSettingPreference', type: 'workSetting', fixedValue: 'no preference' },
    'select your preferred work': { key: 'workSettingPreference', type: 'workSetting', fixedValue: 'no preference' },

    // Skills Experience (radio-button ranges)
    'years have you been working specifically with javascript': { key: 'yearsOfJavaScript', type: 'experienceRange' },
    'years of javascript': { key: 'yearsOfJavaScript', type: 'experienceRange' },
    'experience with javascript': { key: 'yearsOfJavaScript', type: 'experienceRange' },

    // B2B Ecommerce Experience
    'b2b ecommerce': { key: 'yearsOfB2BEcommerce', type: 'experienceRange' },
    'b2b e-commerce': { key: 'yearsOfB2BEcommerce', type: 'experienceRange' },

    // Currently Employed Questions (auto-answer No)
    'currently employed with': { key: 'currentlyEmployed', type: 'radio' },
    'are you currently employed': { key: 'currentlyEmployed', type: 'radio' },

    // Referral Questions (auto-answer No)
    'referred by': { key: 'referralQuestion', type: 'radio', fixedValue: 'No' },
    'were you referred': { key: 'referralQuestion', type: 'radio', fixedValue: 'No' },
    'were you referred by a': { key: 'referralQuestion', type: 'radio', fixedValue: 'No' },
    'who referred you': { key: 'referralName', type: 'text' },
    'if so, who referred you': { key: 'referralName', type: 'text' },

    // SMS/Text Consent (auto-answer Yes)
    'sms consent': { key: 'smsConsent', type: 'radio' },
    'text message consent': { key: 'smsConsent', type: 'radio' },

    // Acknowledgment Questions (auto-answer "I agree" or Yes)
    'acknowledge your understanding': { key: 'acknowledgmentQuestion', type: 'agreementRadio', fixedValue: 'I agree' },
    'please acknowledge': { key: 'acknowledgmentQuestion', type: 'agreementRadio', fixedValue: 'I agree' },
    'acknowledge and agree': { key: 'acknowledgmentQuestion', type: 'agreementRadio', fixedValue: 'I agree' },
    'required to work onsite': { key: 'acknowledgmentQuestion', type: 'agreementRadio', fixedValue: 'I agree' },
    'acknowledgment statement': { key: 'acknowledgmentQuestion', type: 'agreementRadio', fixedValue: 'I agree' },
    'following is an acknowledgment': { key: 'acknowledgmentQuestion', type: 'agreementRadio', fixedValue: 'I agree' },
    'equal opportunity employer': { key: 'acknowledgmentQuestion', type: 'agreementRadio', fixedValue: 'I agree' },
    'religious organization': { key: 'acknowledgmentQuestion', type: 'agreementRadio', fixedValue: 'I agree' },
    'must commit to partner': { key: 'acknowledgmentQuestion', type: 'agreementRadio', fixedValue: 'I agree' },
    'employees must commit': { key: 'acknowledgmentQuestion', type: 'agreementRadio', fixedValue: 'I agree' },

    // Years of Experience Questions
    'years of software development': { key: 'yearsOfSoftwareDevelopment', type: 'text' },
    'years of oop': { key: 'yearsOfOOP', type: 'text' },
    'years of php': { key: 'yearsOfPHP', type: 'text' },
    'years of software architecture': { key: 'yearsOfSoftwareArchitecture', type: 'text' },
    'years of leadership': { key: 'yearsOfLeadership', type: 'text' },
    'years of technical drawing': { key: 'yearsOfTechnicalDrawing', type: 'text' },
    'years of requirements gathering': { key: 'yearsOfRequirementsGathering', type: 'text' },

    // Availability (multi-row dropdowns)
    'available times': { key: 'availabilitySlots', type: 'availabilityDropdowns' },
    'availability': { key: 'availabilitySlots', type: 'availabilityDropdowns' },
    'when are you available': { key: 'availabilitySlots', type: 'availabilityDropdowns' },
    'what times are you available': { key: 'availabilitySlots', type: 'availabilityDropdowns' },

    // Demographics - Gender
    'gender': { key: 'gender', type: 'genderRadio', demographic: true },

    // Demographics - Ethnic Origin (derives from ethnicity setting)
    'ethnic origin': { key: 'ethnicity', type: 'ethnicOrigin', demographic: true },

    // Demographics - Race/Ethnicity
    'ethnicity': { key: 'ethnicity', type: 'raceSelect', demographic: true },
    'race': { key: 'ethnicity', type: 'raceSelect', demographic: true },

    // Veteran Status
    'veteran': { key: 'veteranStatus', type: 'veteranRadio', demographic: true },
    'protected veteran': { key: 'veteranStatus', type: 'veteranRadio', demographic: true },
    'vevraa': { key: 'veteranStatus', type: 'veteranRadio', demographic: true },

    // Disability
    'disability': { key: 'disabilityStatus', type: 'disabilityRadio', demographic: true },
    'form cc-305': { key: 'disabilityStatus', type: 'disabilityRadio', demographic: true },
    'please choose one of the options below': { key: 'disabilityStatus', type: 'disabilityRadio', demographic: true },
    'please check one of the boxes below': { key: 'disabilityStatus', type: 'disabilityRadio', demographic: true },

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

      // Find all question items on the page (both regular questions and demographic questions)
      const questionItems = document.querySelectorAll('.ia-Questions-item, [class*="Questions-item"], [data-testid="single-select-question"]');

      questionItems.forEach(item => {
        const filled = processQuestionItem(item, settings);
        if (filled) filledCount++;
      });

      // Handle demographic questions that may appear dynamically
      if (settings.fillDemographics) {
        filledCount += fillDemographicQuestions(settings);
      }

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

      // Auto-click "Review your application" button after demographics if enabled
      if (settings.fillDemographics && filledCount > 0) {
        handleDemographicsPageContinue();
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
    const pageText = document.body.textContent.toLowerCase();

    if (!reviewHeading && !pageText.includes('review your application')) {
      return false;
    }

    if (reviewHeading && !reviewHeading.textContent.toLowerCase().includes('review your application') &&
        !pageText.includes('review your application')) {
      return false;
    }

    // Function to find and click the submit button
    const findAndClickSubmit = () => {
      // Find and click the submit button - try multiple selectors
      const submitBtn = document.querySelector('[data-testid="submit-application-button"]') ||
        document.querySelector('button[name="submit-application"]') ||
        document.querySelector('button[type="submit"]') ||
        document.querySelector('button[type="submit"][data-testid*="submit"]');

      if (submitBtn) {
        const buttonText = submitBtn.textContent.toLowerCase();
        if (buttonText.includes('submit') && buttonText.includes('application')) {
          console.log('Indeed Autofiller: Found submit button, scrolling into view...');

          // Scroll the button into view
          submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Wait for scroll to complete and button to be clickable
          setTimeout(() => {
            console.log('Indeed Autofiller: Clicking submit button on review page');
            submitBtn.click();
          }, 800);

          return true;
        }
      }
      return false;
    };

    // First scroll to bottom of page to ensure all content is loaded
    console.log('Indeed Autofiller: Scrolling to bottom of review page...');
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

    // Try to find and click after scroll completes
    setTimeout(() => {
      if (findAndClickSubmit()) {
        return;
      }

      // If button still not found, try again after another delay
      setTimeout(() => {
        if (findAndClickSubmit()) {
          console.log('Indeed Autofiller: Submit button found on retry');
        } else {
          console.log('Indeed Autofiller: Submit button not found after retries');
        }
      }, 1000);
    }, 1000);

    // Return true to indicate we're on a review page
    return true;
  }

  // Handle demographics page - auto-click "Review your application" button
  function handleDemographicsPageContinue() {
    // Look for demographic indicators on the page
    const pageText = document.body.textContent.toLowerCase();
    const hasDemographicContent = pageText.includes('veteran') ||
                                  pageText.includes('ethnicity') ||
                                  pageText.includes('race') ||
                                  pageText.includes('gender') ||
                                  pageText.includes('disability') ||
                                  pageText.includes('eeoc') ||
                                  pageText.includes('vevraa');

    if (!hasDemographicContent) {
      return false;
    }

    // Look for "Review your application" button or similar
    const buttons = document.querySelectorAll('button, [role="button"]');
    for (const button of buttons) {
      const buttonText = button.textContent.toLowerCase();
      if (buttonText.includes('review') && buttonText.includes('application')) {
        console.log('Indeed Autofiller: Found "Review your application" button after demographics');

        // Scroll button into view
        button.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Click after a short delay
        setTimeout(() => {
          console.log('Indeed Autofiller: Clicking "Review your application" button');
          button.click();
        }, 800);

        return true;
      }
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

        // Handle fixed values (always use this value regardless of settings)
        if (config.fixedValue) {
          value = config.fixedValue;
        } else if (config.key === 'smsConsent') {
          value = 'Yes'; // Always answer Yes for SMS consent
        } else if (config.key === 'referralName') {
          value = 'N/A'; // Always answer N/A for referral name
        } else if (config.key === 'howDidYouHear') {
          value = 'Indeed.com'; // Always answer Indeed.com for "How did you hear about this job?"
        } else if (config.key === 'country') {
          value = settings.country || 'United States'; // Default to United States
        } else if (config.key === 'autoDate') {
          value = settings.autoFillDate !== false ? getTodayDate() : null;
        } else {
          value = settings[config.key];
        }

        if (!value) continue;

        return fillField(item, config.type, value, settings);
      }
    }

    return false;
  }

  // Fill a field based on its type
  function fillField(container, type, value, settings = {}) {
    try {
      switch (type) {
        case 'text':
          return fillTextField(container, value);
        case 'select':
          return fillSelectField(container, value);
        case 'radio':
          return fillRadioField(container, value);
        case 'genderRadio':
          return fillGenderRadioField(container, value);
        case 'date':
          return fillDateField(container, value);
        case 'combobox':
          return fillComboboxField(container, value);
        case 'education':
          return fillEducationField(container, value);
        case 'educationAuto':
          return fillEducationAutoField(container, value);
        case 'stateText':
          return fillStateTextField(container, value);
        case 'countryText':
          return fillCountryTextField(container, value);
        case 'securityClearanceSelect':
          return fillSecurityClearanceSelectField(container, value);
        case 'workSetting':
          return fillWorkSettingField(container, value);
        case 'experienceRange':
          return fillExperienceRangeField(container, value);
        case 'ethnicOrigin':
          return fillEthnicOriginField(container, value);
        case 'raceSelect':
          return fillRaceSelectField(container, value);
        case 'veteranRadio':
          return fillVeteranRadioField(container, value);
        case 'disabilityRadio':
          return fillDisabilityRadioField(container, value);
        case 'howDidYouHearSelect':
          return fillHowDidYouHearField(container, value);
        case 'countrySelect':
          return fillCountrySelectField(container, value);
        case 'agreementRadio':
          return fillAgreementRadioField(container, value);
        case 'availabilityDropdowns':
          return fillAvailabilityDropdowns(container, value);
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

  // Fill gender radio field for demographic questions
  // Maps: 1 = Male, 2 = Female, 3 = I decline to identify
  function fillGenderRadioField(container, value) {
    // First try to find radios in the container
    let radios = container.querySelectorAll('input[type="radio"]');

    // If not found, look for the demographic question structure
    if (!radios.length) {
      const demographicContainer = document.querySelector('[class*="demographic-questions"] [data-testid="single-select-question"]');
      if (demographicContainer) {
        const labelEl = demographicContainer.querySelector('[data-testid="single-select-question-label"]');
        if (labelEl && labelEl.textContent.toLowerCase().includes('gender')) {
          radios = demographicContainer.querySelectorAll('input[type="radio"]');
        }
      }
    }

    if (!radios.length) return false;

    // Map our setting values to radio values and label text
    const genderMap = {
      '1': { value: '1', labels: ['male'] },
      '2': { value: '2', labels: ['female'] },
      '3': { value: '3', labels: ['decline', 'i decline'] }
    };

    const mapping = genderMap[value];
    if (!mapping) return false;

    for (const radio of radios) {
      const radioValue = radio.value;
      const labelEl = container.querySelector(`label[for="${radio.id}"]`) ||
                      radio.closest('label');
      const labelText = labelEl?.textContent?.toLowerCase().trim() || '';

      // Match by value first (most reliable for Indeed's structure)
      if (radioValue === mapping.value) {
        radio.checked = true;
        triggerEvents(radio);
        return true;
      }

      // Fallback: match by label text
      if (mapping.labels.some(l => labelText.includes(l))) {
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

  // Fill education level radio field
  function fillEducationField(container, value) {
    const radios = container.querySelectorAll('input[type="radio"]');
    if (!radios.length) return false;

    // Map extension values to label text patterns
    const educationMap = {
      'high_school': ['high school', 'ged', 'diploma'],
      'associates': ['associate'],
      'bachelors': ['bachelor'],
      'graduate': ['graduate', 'master', 'phd', 'doctorate']
    };

    const patterns = educationMap[value] || [];

    for (const radio of radios) {
      const labelEl = container.querySelector(`label[for="${radio.id}"]`);
      const labelText = labelEl?.textContent?.toLowerCase().trim() || '';

      // Check if label text matches any of our patterns
      if (patterns.some(p => labelText.includes(p))) {
        radio.checked = true;
        triggerEvents(radio);
        return true;
      }
    }

    return false;
  }

  // Fill education level - auto-detect radio or select dropdown
  function fillEducationAutoField(container, value) {
    // First check for select dropdown
    const select = container.querySelector('select');
    if (select) {
      return fillEducationSelectField(container, value);
    }

    // Fall back to radio buttons
    return fillEducationField(container, value);
  }

  // Fill education level select dropdown
  function fillEducationSelectField(container, value) {
    const select = container.querySelector('select');
    if (!select) return false;

    // Map extension values to dropdown label patterns
    const educationMap = {
      'high_school': ['high school', 'hs diploma', 'ged', 'diploma', 'equivalent'],
      'associates': ['associate', 'aa degree'],
      'bachelors': ['bachelor', 'bs degree', 'ba degree'],
      'graduate': ['graduate', 'master', 'ma degree', 'mba', 'phd', 'doctorate']
    };

    const patterns = educationMap[value] || [];
    const options = Array.from(select.options);

    for (const option of options) {
      const label = option.label?.toLowerCase() || '';
      const text = option.text?.toLowerCase() || '';

      // Check if option matches any of our patterns
      if (patterns.some(p => label.includes(p) || text.includes(p))) {
        select.value = option.value;
        triggerEvents(select);
        return true;
      }
    }

    return false;
  }

  // Fill State as text field (converts abbreviation to full name if needed)
  function fillStateTextField(container, value) {
    const input = container.querySelector('input[type="text"], input:not([type])');
    if (!input || input.value) return false;

    // State abbreviation to full name map
    const stateNames = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
      'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
      'DC': 'District of Columbia', 'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii',
      'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
      'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine',
      'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota',
      'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska',
      'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico',
      'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
      'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island',
      'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas',
      'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington',
      'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
    };

    // If value is an abbreviation, convert to full name
    const stateValue = stateNames[value.toUpperCase()] || value;
    setInputValue(input, stateValue);
    return true;
  }

  // Fill Country as text field
  function fillCountryTextField(container, value) {
    const input = container.querySelector('input[type="text"], input:not([type])');
    if (!input || input.value) return false;

    // Default to "United States" if no value
    const countryValue = value || 'United States';
    setInputValue(input, countryValue);
    return true;
  }

  // Fill Security Clearance Level dropdown
  function fillSecurityClearanceSelectField(container, value) {
    const select = container.querySelector('select');
    if (!select) return false;

    // If no value, select "N/A" or first option
    if (!value) {
      const naOption = Array.from(select.options).find(opt =>
        opt.label?.toLowerCase() === 'n/a' || opt.text?.toLowerCase() === 'n/a'
      );
      if (naOption) {
        select.value = naOption.value;
        triggerEvents(select);
        return true;
      }
      return false;
    }

    // Map setting values to dropdown labels
    const clearanceMap = {
      'none': ['n/a', 'none'],
      'secret': ['secret'],
      'top_secret': ['top secret'],
      'ts_sci': ['top secret/sci', 'ts/sci'],
      'ts_sci_poly': ['poly', 'polygraph']
    };

    const patterns = clearanceMap[value] || [value.toLowerCase()];
    const options = Array.from(select.options);

    for (const option of options) {
      const label = option.label?.toLowerCase() || '';
      const text = option.text?.toLowerCase() || '';

      for (const pattern of patterns) {
        if (label.includes(pattern) || text.includes(pattern)) {
          select.value = option.value;
          triggerEvents(select);
          return true;
        }
      }
    }

    return false;
  }

  // Fill work setting preference radio field (always "No preference")
  function fillWorkSettingField(container, value) {
    const radios = container.querySelectorAll('input[type="radio"]');
    if (!radios.length) return false;

    const valueLower = value.toLowerCase();

    for (const radio of radios) {
      const labelEl = container.querySelector(`label[for="${radio.id}"]`);
      const labelText = labelEl?.textContent?.toLowerCase().trim() || '';

      // Match by label text containing the value
      if (labelText.includes(valueLower)) {
        radio.checked = true;
        triggerEvents(radio);
        return true;
      }
    }

    return false;
  }

  // Fill experience range radio field (maps numeric years to ranges)
  function fillExperienceRangeField(container, value) {
    const radios = container.querySelectorAll('input[type="radio"]');
    if (!radios.length) return false;

    const years = parseInt(value, 10);
    if (isNaN(years)) return false;

    // Collect all radio options with their labels and parsed ranges
    const options = [];
    for (const radio of radios) {
      const labelEl = container.querySelector(`label[for="${radio.id}"]`);
      const labelText = labelEl?.textContent?.toLowerCase().trim() || '';
      options.push({ radio, labelText });
    }

    // Try to find the best matching range
    for (const { radio, labelText } of options) {
      // Check for "None" or "0" for 0 years
      if (years === 0 && (labelText.includes('none') || labelText === '0')) {
        radio.checked = true;
        triggerEvents(radio);
        return true;
      }

      // Check for "Less than X years"
      const lessThanMatch = labelText.match(/less than (\d+)/);
      if (lessThanMatch) {
        const threshold = parseInt(lessThanMatch[1], 10);
        if (years < threshold) {
          radio.checked = true;
          triggerEvents(radio);
          return true;
        }
        continue;
      }

      // Check for "X+ years" or "X or more"
      const plusMatch = labelText.match(/(\d+)\+|(\d+) or more|(\d+)\s*years or more/);
      if (plusMatch) {
        const threshold = parseInt(plusMatch[1] || plusMatch[2] || plusMatch[3], 10);
        if (years >= threshold) {
          radio.checked = true;
          triggerEvents(radio);
          return true;
        }
        continue;
      }

      // Check for "X-Y years" or "X–Y years" (en-dash)
      const rangeMatch = labelText.match(/(\d+)\s*[-–]\s*(\d+)/);
      if (rangeMatch) {
        const min = parseInt(rangeMatch[1], 10);
        const max = parseInt(rangeMatch[2], 10);
        if (years >= min && years <= max) {
          radio.checked = true;
          triggerEvents(radio);
          return true;
        }
      }
    }

    // Fallback: if years > 0 but no match, try to find highest available option
    if (years > 0) {
      // Find the option with the highest number
      let bestOption = null;
      let bestThreshold = -1;

      for (const { radio, labelText } of options) {
        const plusMatch = labelText.match(/(\d+)\+/);
        if (plusMatch) {
          const threshold = parseInt(plusMatch[1], 10);
          if (threshold > bestThreshold) {
            bestThreshold = threshold;
            bestOption = radio;
          }
        }
      }

      if (bestOption) {
        bestOption.checked = true;
        triggerEvents(bestOption);
        return true;
      }
    }

    return false;
  }

  // Fill ethnic origin radio field (Hispanic/Latino vs Not Hispanic/Latino)
  // Derives from the ethnicity setting
  function fillEthnicOriginField(container, ethnicityValue) {
    const radios = container.querySelectorAll('input[type="radio"]');
    if (!radios.length) return false;

    // Map our ethnicity setting to ethnic origin
    // If ethnicity is "Hispanic or Latino" (value 1), select Hispanic
    // Otherwise select "Not Hispanic or Latino" or "Decline" based on setting
    let targetValue;
    if (ethnicityValue === '1' || ethnicityValue === 'Hispanic or Latino') {
      targetValue = 'hispanic';
    } else if (ethnicityValue === '8' || ethnicityValue === 'decline' || ethnicityValue === 'I decline to identify') {
      targetValue = 'decline';
    } else {
      targetValue = 'not hispanic';
    }

    for (const radio of radios) {
      const labelEl = container.querySelector(`label[for="${radio.id}"]`);
      const labelText = labelEl?.textContent?.toLowerCase().trim() || '';
      const radioValue = radio.value?.toLowerCase() || '';

      if (targetValue === 'hispanic' && (labelText.includes('hispanic/latino') || radioValue.includes('hispanic or latino'))) {
        if (!labelText.includes('not ')) {
          radio.checked = true;
          triggerEvents(radio);
          return true;
        }
      } else if (targetValue === 'not hispanic' && (labelText.includes('not hispanic') || radioValue.includes('not hispanic'))) {
        radio.checked = true;
        triggerEvents(radio);
        return true;
      } else if (targetValue === 'decline' && (labelText.includes('decline') || radioValue === 'decline')) {
        radio.checked = true;
        triggerEvents(radio);
        return true;
      }
    }

    return false;
  }

  // Fill race select dropdown for demographic questions
  function fillRaceSelectField(container, value) {
    // Try to find a select dropdown first
    const select = container.querySelector('select');
    if (select) {
      // Map numeric ethnicity values to text
      const raceMap = {
        '1': 'Hispanic or Latino',
        '2': 'White',
        '3': 'Black or African American',
        '4': 'Native Hawaiian or Pacific Islander',
        '5': 'Asian',
        '6': 'American Indian or Alaska Native',
        '7': 'Two or More',
        '8': 'Decline'
      };

      const targetText = raceMap[value] || value;
      const options = Array.from(select.options);

      for (const option of options) {
        const optionText = option.text?.toLowerCase() || '';
        const optionValue = option.value?.toLowerCase() || '';
        const targetLower = targetText.toLowerCase();

        if (optionText.includes(targetLower) || optionValue.includes(targetLower) ||
            (targetLower === 'white' && optionValue === 'white') ||
            (targetLower.includes('black') && optionText.includes('black')) ||
            (targetLower.includes('asian') && optionText.includes('asian')) ||
            (targetLower.includes('native hawaiian') && optionText.includes('native hawaiian')) ||
            (targetLower.includes('american indian') && optionText.includes('american indian')) ||
            (targetLower.includes('two or more') && optionText.includes('two or more')) ||
            (targetLower.includes('decline') && (optionText.includes('decline') || optionValue === 'decline'))) {
          select.value = option.value;
          triggerEvents(select);
          return true;
        }
      }
    }

    // Fallback to radio buttons if no select found
    return fillSelectField(container, value);
  }

  // Fill veteran status radio for demographic questions
  function fillVeteranRadioField(container, value) {
    const radios = container.querySelectorAll('input[type="radio"]');
    if (!radios.length) return false;

    // Map our veteranStatus setting values to radio values
    // 51 = protected veteran (Yes), 52 = not protected (No), 53 = decline
    const valueMap = {
      '51': ['yes', 'protected'],
      '52': ['no'],
      '53': ['decline', 'do not wish']
    };

    const targets = valueMap[value] || [value.toLowerCase()];

    for (const radio of radios) {
      const labelEl = container.querySelector(`label[for="${radio.id}"]`);
      const labelText = labelEl?.textContent?.toLowerCase().trim() || '';
      const radioValue = radio.value?.toLowerCase() || '';

      for (const target of targets) {
        if (labelText.includes(target) || radioValue.includes(target) || radioValue === target) {
          radio.checked = true;
          triggerEvents(radio);
          return true;
        }
      }
    }

    return false;
  }

  // Fill disability status radio for demographic questions
  function fillDisabilityRadioField(container, value) {
    // First try to find radios in the container
    let radios = container.querySelectorAll('input[type="radio"]');

    // If not found, look for the demographic question structure
    if (!radios.length) {
      const demographicContainer = document.querySelector('[class*="demographic-questions"] [data-testid="single-select-question"]');
      if (demographicContainer) {
        const labelEl = demographicContainer.querySelector('[data-testid="single-select-question-label"]');
        if (labelEl && labelEl.textContent.toLowerCase().includes('disability')) {
          radios = demographicContainer.querySelectorAll('input[type="radio"]');
        }
      }
    }

    // Also try to find by input name containing 'disability'
    if (!radios.length) {
      radios = document.querySelectorAll('input[type="radio"][name*="disability"]');
    }

    if (!radios.length) return false;

    // Map our disabilityStatus setting values to radio values and label patterns
    // 1 = have disability, 2 = no disability, 3 = decline
    const disabilityMap = {
      '1': { value: '1', labels: ['yes', 'have a disability', 'have had one'] },
      '2': { value: '2', labels: ['no', 'do not have a disability'] },
      '3': { value: '3', labels: ['do not want to answer', 'decline'] }
    };

    const mapping = disabilityMap[value];
    if (!mapping) return false;

    for (const radio of radios) {
      const radioValue = radio.value;
      const labelEl = container.querySelector(`label[for="${radio.id}"]`) ||
                      radio.closest('label');
      const labelText = labelEl?.textContent?.toLowerCase().trim() || '';

      // Match by value first (most reliable for Indeed's structure)
      if (radioValue === mapping.value) {
        radio.checked = true;
        triggerEvents(radio);
        return true;
      }

      // Fallback: match by label text
      if (mapping.labels.some(l => labelText.includes(l))) {
        radio.checked = true;
        triggerEvents(radio);
        return true;
      }
    }

    return false;
  }

  // Fill "How did you hear about this position" dropdown/text field
  // Always selects "Indeed" if available in dropdown, or fills "Indeed.com" in text field
  function fillHowDidYouHearField(container, value) {
    // First try to find a select dropdown
    const select = container.querySelector('select');
    if (select) {
      const options = Array.from(select.options);

      // Look for "Indeed" option (case insensitive)
      const indeedOption = options.find(opt => {
        const label = opt.label?.toLowerCase() || '';
        const text = opt.text?.toLowerCase() || '';
        return label === 'indeed' || text === 'indeed' ||
               label.includes('indeed') || text.includes('indeed');
      });

      if (indeedOption) {
        select.value = indeedOption.value;
        triggerEvents(select);
        return true;
      }

      // Fallback: look for "Job Board" or "Online" options
      const fallbackOption = options.find(opt => {
        const label = opt.label?.toLowerCase() || '';
        return label.includes('job board') || label.includes('online');
      });

      if (fallbackOption) {
        select.value = fallbackOption.value;
        triggerEvents(select);
        return true;
      }
    }

    // If no select, try text field
    const input = container.querySelector('input[type="text"], input:not([type])');
    if (input && !input.value) {
      setInputValue(input, 'Indeed.com');
      return true;
    }

    return false;
  }

  // Fill country selection dropdown
  // Defaults to "United States" unless a different country is configured
  function fillCountrySelectField(container, value) {
    const select = container.querySelector('select');
    if (!select) return false;

    // Default to "United States" if no value provided
    const targetCountry = value || 'United States';
    const targetLower = targetCountry.toLowerCase();

    const options = Array.from(select.options);

    // Try to find exact match first
    let option = options.find(opt => {
      const label = opt.label?.toLowerCase() || '';
      const text = opt.text?.toLowerCase() || '';
      return label === targetLower || text === targetLower;
    });

    // If no exact match, try partial match
    if (!option) {
      option = options.find(opt => {
        const label = opt.label?.toLowerCase() || '';
        const text = opt.text?.toLowerCase() || '';
        return label.includes(targetLower) || text.includes(targetLower);
      });
    }

    if (option) {
      select.value = option.value;
      triggerEvents(select);
      return true;
    }

    return false;
  }

  // Fill agreement/acknowledgment radio fields
  // Selects "I agree" or equivalent option
  function fillAgreementRadioField(container, value) {
    const radios = container.querySelectorAll('input[type="radio"]');
    if (!radios.length) return false;

    // Look for the agreement option
    const agreePatterns = ['i agree', 'agree', 'yes', 'accept'];

    for (const radio of radios) {
      const labelEl = container.querySelector(`label[for="${radio.id}"]`);
      const labelText = labelEl?.textContent?.toLowerCase().trim() || '';

      // Check if this is an agreement option (not a disagreement)
      const isDisagree = labelText.includes('not in full agreement') ||
                         labelText.includes('do not agree') ||
                         labelText.includes('disagree');

      if (isDisagree) continue;

      // Check if this matches an agree pattern
      for (const pattern of agreePatterns) {
        if (labelText.includes(pattern) || labelText === pattern) {
          radio.checked = true;
          triggerEvents(radio);
          return true;
        }
      }
    }

    return false;
  }

  // Fill availability dropdown pairs (day + time)
  // Indeed uses rows with two dropdowns each: day slot and time slot
  function fillAvailabilityDropdowns(container, slots) {
    if (!slots || !Array.isArray(slots) || slots.length === 0) return false;

    // Find all select dropdowns - look in the broader page context for availability sections
    let selects = container.querySelectorAll('select');

    // If we don't find enough selects in the container, look for the availability module
    if (selects.length < 2) {
      const availModule = document.querySelector('[class*="apply-questions"]');
      if (availModule) {
        selects = availModule.querySelectorAll('select');
      }
    }

    if (selects.length < 2) return false;

    let filled = false;

    // Day options - Indeed uses "Weekday", "Monday", etc.
    const dayKeywords = ['weekday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    // Time options - Indeed uses "Anytime", "Morning", "Afternoon", "Evening"
    const timeKeywords = ['anytime', 'morning', 'afternoon', 'evening'];

    // Try to identify which selects are day vs time by their options
    const selectPairs = [];

    // Group selects into pairs (day, time)
    for (let i = 0; i < selects.length; i++) {
      const select = selects[i];
      const options = Array.from(select.options).map(o => (o.text?.toLowerCase() || o.label?.toLowerCase() || ''));

      // Check if this is a day dropdown (has day names)
      const isDayDropdown = options.some(opt => dayKeywords.some(d => opt.includes(d)));
      // Check if this is a time dropdown (has time keywords)
      const isTimeDropdown = options.some(opt => timeKeywords.some(t => opt.includes(t)));

      if (isDayDropdown) {
        // Look for the next time dropdown
        for (let j = i + 1; j < selects.length; j++) {
          const nextSelect = selects[j];
          const nextOptions = Array.from(nextSelect.options).map(o => (o.text?.toLowerCase() || o.label?.toLowerCase() || ''));
          const nextIsTimeDropdown = nextOptions.some(opt => timeKeywords.some(t => opt.includes(t)));

          if (nextIsTimeDropdown) {
            selectPairs.push({ daySelect: select, timeSelect: nextSelect });
            i = j; // Skip the time dropdown in the outer loop
            break;
          }
        }
      }
    }

    // Fill each pair with our saved slots
    for (let i = 0; i < Math.min(slots.length, selectPairs.length); i++) {
      const slot = slots[i];
      const pair = selectPairs[i];

      if (!slot.day || !slot.time) continue;

      // Fill day dropdown - match by exact value or by text content
      const dayOption = Array.from(pair.daySelect.options).find(opt => {
        const value = opt.value?.toLowerCase() || '';
        const text = opt.text?.toLowerCase() || '';
        const slotDay = slot.day.toLowerCase();
        return value === slotDay || text === slotDay || value.includes(slotDay) || text.includes(slotDay);
      });

      if (dayOption) {
        pair.daySelect.value = dayOption.value;
        triggerEvents(pair.daySelect);
        filled = true;
      }

      // Fill time dropdown - match by value or partial text
      // Our saved values are like "Morning (8am - 12pm)" which should match Indeed's options
      const timeOption = Array.from(pair.timeSelect.options).find(opt => {
        const value = opt.value?.toLowerCase() || '';
        const text = opt.text?.toLowerCase() || '';
        const slotTime = slot.time.toLowerCase();

        // Exact match first
        if (value === slotTime || text === slotTime) return true;

        // Partial match - extract the time keyword (morning, afternoon, etc.)
        const timeKeyword = slotTime.split(' ')[0]; // "morning" from "morning (8am - 12pm)"
        return value.includes(timeKeyword) || text.includes(timeKeyword);
      });

      if (timeOption) {
        pair.timeSelect.value = timeOption.value;
        triggerEvents(pair.timeSelect);
        filled = true;
      }
    }

    return filled;
  }

  // Handle demographic questions that may appear dynamically
  function fillDemographicQuestions(settings) {
    let count = 0;

    // Find all demographic question containers
    const demographicContainers = document.querySelectorAll('[class*="demographic-questions"]');

    demographicContainers.forEach(container => {
      // Find the label text
      const labelEl = container.querySelector('[data-testid="single-select-question-label"] [data-testid="safe-markup"]') ||
                      container.querySelector('[data-testid="safe-markup"]') ||
                      container.querySelector('label');

      if (!labelEl) return;

      const labelText = labelEl.textContent.toLowerCase().trim();

      // Handle Gender
      if (labelText.includes('gender') && settings.gender) {
        if (fillGenderRadioField(container, settings.gender)) {
          count++;
        }
      }

      // Handle Ethnic Origin
      if (labelText.includes('ethnic origin') && settings.ethnicity) {
        if (fillEthnicOriginField(container, settings.ethnicity)) {
          count++;
        }
      }

      // Handle Race dropdown
      if ((labelText === 'race' || labelText.includes('race')) && settings.ethnicity) {
        if (fillRaceSelectField(container, settings.ethnicity)) {
          count++;
        }
      }

      // Handle Veteran status
      if (labelText.includes('veteran') && settings.veteranStatus) {
        if (fillVeteranRadioField(container, settings.veteranStatus)) {
          count++;
        }
      }

      // Handle Disability status (including "Please choose one of the options below:")
      if ((labelText.includes('disability') || labelText.includes('please choose one of the options below')) && settings.disabilityStatus) {
        // Check if it's actually a disability question by looking at radio values
        const radios = container.querySelectorAll('input[type="radio"]');
        const hasDisabilityOptions = Array.from(radios).some(r =>
          r.value?.toLowerCase().includes('disabled') ||
          r.value?.toLowerCase().includes('notdisabled')
        );

        if (hasDisabilityOptions || labelText.includes('disability')) {
          if (fillDisabilityRadioField(container, settings.disabilityStatus)) {
            count++;
          }
        }
      }
    });

    return count;
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
  let demographicDebounce = null;

  new MutationObserver((mutations) => {
    // Handle URL changes
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(checkAutoFill, 1000);
      return;
    }

    // Check for dynamically appearing demographic questions
    // This handles the Race dropdown that appears after selecting Ethnic Origin
    const hasDemographicChanges = mutations.some(mutation => {
      return Array.from(mutation.addedNodes).some(node => {
        if (node.nodeType !== Node.ELEMENT_NODE) return false;
        return node.matches?.('[class*="demographic-questions"]') ||
               node.querySelector?.('[class*="demographic-questions"]') ||
               node.matches?.('select[data-testid="single-select-question-select"]') ||
               node.querySelector?.('select[data-testid="single-select-question-select"]');
      });
    });

    if (hasDemographicChanges) {
      // Debounce to avoid multiple rapid fills
      clearTimeout(demographicDebounce);
      demographicDebounce = setTimeout(async () => {
        try {
          const settings = await chrome.storage.sync.get(null);
          if (settings.fillDemographics) {
            const filled = fillDemographicQuestions(settings);
            if (filled > 0) {
              console.log(`Indeed Autofiller: Filled ${filled} dynamic demographic field(s)`);
            }
          }
        } catch (error) {
          console.error('Indeed Autofiller: Error filling dynamic demographic questions', error);
        }
      }, 500);
    }
  }).observe(document.body, { subtree: true, childList: true });

  console.log('Indeed Autofiller: Content script loaded');
})();
