// Field IDs to save/load
const FIELDS = {
  contact: ['phone', 'address', 'city', 'cityState', 'state', 'zipCode', 'country'],
  experience: ['jobTitle', 'companyName', 'middleName', 'degreeMajor', 'securityClearanceLevel', 'yearsOfSoftwareDevelopment', 'yearsOfOOP', 'yearsOfPHP', 'yearsOfSoftwareArchitecture', 'yearsOfLeadership', 'yearsOfTechnicalDrawing', 'yearsOfRequirementsGathering', 'yearsOfJavaScript', 'yearsOfB2BEcommerce', 'availableTimes'],
  questions: ['linkedinUrl', 'githubUrl', 'authorizedToWork', 'requireSponsorship', 'overAge18', 'educationLevel', 'securityClearance', 'backgroundCheck', 'textOptIn', 'privacyPolicy', 'referralQuestion', 'acknowledgmentQuestion'],
  demographics: ['fullName', 'gender', 'ethnicity', 'veteranStatus', 'disabilityStatus'],
  settings: ['autoFillOnLoad', 'showNotification', 'fillDemographics', 'autoFillDate', 'autoClickResumeContinue', 'autoSubmitReview', 'autoCloseAfterSubmit']
};

// Tab order for auto-advance
const TAB_ORDER = ['contact', 'experience', 'questions', 'demographics', 'settings'];

// Load saved settings when popup opens
document.addEventListener('DOMContentLoaded', loadSettings);

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    // Remove active class from all tabs and content
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    // Add active class to clicked tab and corresponding content
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
});

// Save button
document.getElementById('saveBtn').addEventListener('click', saveSettings);

// Autofill button
document.getElementById('autofillBtn').addEventListener('click', triggerAutofill);

// Clear data button
document.getElementById('clearDataBtn').addEventListener('click', clearAllData);

// Auto-compile City, State combo field
document.getElementById('city').addEventListener('input', updateCityState);
document.getElementById('state').addEventListener('change', updateCityState);

async function loadSettings() {
  try {
    const data = await chrome.storage.sync.get(null);

    // Load all fields
    Object.values(FIELDS).flat().forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (!element) return;

      if (element.type === 'checkbox') {
        element.checked = data[fieldId] ?? element.hasAttribute('checked');
      } else {
        element.value = data[fieldId] || '';
      }
    });

    // Auto-compile City, State combo after loading
    updateCityState();
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

async function saveSettings() {
  try {
    const data = {};

    // Collect all field values
    Object.values(FIELDS).flat().forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (!element) return;

      if (element.type === 'checkbox') {
        data[fieldId] = element.checked;
      } else {
        data[fieldId] = element.value;
      }
    });

    await chrome.storage.sync.set(data);
    showStatus('Settings saved!');

    // Auto-advance to next tab
    advanceToNextTab();
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings', true);
  }
}

function advanceToNextTab() {
  const activeTab = document.querySelector('.tab.active');
  if (!activeTab) return;

  const currentTabName = activeTab.dataset.tab;
  const currentIndex = TAB_ORDER.indexOf(currentTabName);

  // If not the last tab, advance to next
  if (currentIndex < TAB_ORDER.length - 1) {
    const nextTabName = TAB_ORDER[currentIndex + 1];
    const nextTab = document.querySelector(`.tab[data-tab="${nextTabName}"]`);

    if (nextTab) {
      // Remove active class from all tabs and content
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      // Add active class to next tab and corresponding content
      nextTab.classList.add('active');
      document.getElementById(nextTabName).classList.add('active');
    }
  }
}

async function triggerAutofill() {
  try {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url?.includes('indeed.com')) {
      showStatus('Not on Indeed.com', true);
      return;
    }

    // Send message to content script
    await chrome.tabs.sendMessage(tab.id, { action: 'autofill' });
    showStatus('Autofill triggered!');
  } catch (error) {
    console.error('Error triggering autofill:', error);
    showStatus('Error: Refresh the page', true);
  }
}

async function clearAllData() {
  if (!confirm('Are you sure you want to clear all saved data?')) return;

  try {
    await chrome.storage.sync.clear();

    // Reset all fields
    Object.values(FIELDS).flat().forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (!element) return;

      if (element.type === 'checkbox') {
        element.checked = fieldId === 'showNotification' || fieldId === 'autoFillDate';
      } else {
        element.value = '';
      }
    });

    showStatus('Data cleared!');
  } catch (error) {
    console.error('Error clearing data:', error);
    showStatus('Error clearing data', true);
  }
}

function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.style.color = isError ? '#dc3545' : '#28a745';

  setTimeout(() => {
    status.textContent = '';
  }, 3000);
}

function updateCityState() {
  const city = document.getElementById('city').value.trim();
  const state = document.getElementById('state').value;

  // Only update if both city and state have values
  if (city && state) {
    document.getElementById('cityState').value = `${city}, ${state}`;
  } else if (city) {
    // If only city is filled, just show the city
    document.getElementById('cityState').value = city;
  } else {
    // Clear the combo field if city is empty
    document.getElementById('cityState').value = '';
  }
}
