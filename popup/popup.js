// Field IDs to save/load
const FIELDS = {
  contact: ['phone', 'address', 'city', 'cityState', 'state', 'zipCode', 'country'],
  experience: ['jobTitle', 'companyName', 'middleName', 'degreeMajor', 'securityClearanceLevel', 'yearsOfSoftwareDevelopment', 'yearsOfOOP', 'yearsOfPHP', 'yearsOfSoftwareArchitecture', 'yearsOfLeadership', 'yearsOfTechnicalDrawing', 'yearsOfRequirementsGathering', 'yearsOfJavaScript', 'yearsOfB2BEcommerce'],
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

// Availability row handling
document.getElementById('addAvailabilityRow').addEventListener('click', addAvailabilityRow);
document.getElementById('availabilityContainer').addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-remove-row')) {
    const rows = document.querySelectorAll('.availability-row');
    if (rows.length > 1) {
      e.target.closest('.availability-row').remove();
    }
  }
});

function addAvailabilityRow() {
  const container = document.getElementById('availabilityContainer');
  const newRow = document.createElement('div');
  newRow.className = 'availability-row';
  newRow.innerHTML = `
    <select class="availability-day">
      <option value="">Select Day</option>
      <option value="Weekday">Weekday</option>
      <option value="Monday">Monday</option>
      <option value="Tuesday">Tuesday</option>
      <option value="Wednesday">Wednesday</option>
      <option value="Thursday">Thursday</option>
      <option value="Friday">Friday</option>
    </select>
    <select class="availability-time">
      <option value="">Select Time</option>
      <option value="Anytime (8am - 9pm)">Anytime (8am - 9pm)</option>
      <option value="Morning (8am - 12pm)">Morning (8am - 12pm)</option>
      <option value="Afternoon (12pm - 5pm)">Afternoon (12pm - 5pm)</option>
      <option value="Evening (5pm - 9pm)">Evening (5pm - 9pm)</option>
    </select>
    <button type="button" class="btn-remove-row" title="Remove row">×</button>
  `;
  container.appendChild(newRow);
}

function getAvailabilitySlots() {
  const slots = [];
  document.querySelectorAll('.availability-row').forEach(row => {
    const day = row.querySelector('.availability-day').value;
    const time = row.querySelector('.availability-time').value;
    if (day && time) {
      slots.push({ day, time });
    }
  });
  return slots;
}

function loadAvailabilitySlots(slots) {
  const container = document.getElementById('availabilityContainer');

  if (!slots || slots.length === 0) {
    // Keep the default empty row
    return;
  }

  // Clear existing rows
  container.innerHTML = '';

  // Add rows for each saved slot
  slots.forEach(slot => {
    const newRow = document.createElement('div');
    newRow.className = 'availability-row';
    newRow.innerHTML = `
      <select class="availability-day">
        <option value="">Select Day</option>
        <option value="Weekday" ${slot.day === 'Weekday' ? 'selected' : ''}>Weekday</option>
        <option value="Monday" ${slot.day === 'Monday' ? 'selected' : ''}>Monday</option>
        <option value="Tuesday" ${slot.day === 'Tuesday' ? 'selected' : ''}>Tuesday</option>
        <option value="Wednesday" ${slot.day === 'Wednesday' ? 'selected' : ''}>Wednesday</option>
        <option value="Thursday" ${slot.day === 'Thursday' ? 'selected' : ''}>Thursday</option>
        <option value="Friday" ${slot.day === 'Friday' ? 'selected' : ''}>Friday</option>
      </select>
      <select class="availability-time">
        <option value="">Select Time</option>
        <option value="Anytime (8am - 9pm)" ${slot.time === 'Anytime (8am - 9pm)' ? 'selected' : ''}>Anytime (8am - 9pm)</option>
        <option value="Morning (8am - 12pm)" ${slot.time === 'Morning (8am - 12pm)' ? 'selected' : ''}>Morning (8am - 12pm)</option>
        <option value="Afternoon (12pm - 5pm)" ${slot.time === 'Afternoon (12pm - 5pm)' ? 'selected' : ''}>Afternoon (12pm - 5pm)</option>
        <option value="Evening (5pm - 9pm)" ${slot.time === 'Evening (5pm - 9pm)' ? 'selected' : ''}>Evening (5pm - 9pm)</option>
      </select>
      <button type="button" class="btn-remove-row" title="Remove row">×</button>
    `;
    container.appendChild(newRow);
  });
}

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

    // Load availability slots
    if (data.availabilitySlots) {
      loadAvailabilitySlots(data.availabilitySlots);
    }

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

    // Save availability slots
    data.availabilitySlots = getAvailabilitySlots();

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

    // Reset availability to single empty row
    const container = document.getElementById('availabilityContainer');
    container.innerHTML = `
      <div class="availability-row">
        <select class="availability-day">
          <option value="">Select Day</option>
          <option value="Weekday">Weekday</option>
          <option value="Monday">Monday</option>
          <option value="Tuesday">Tuesday</option>
          <option value="Wednesday">Wednesday</option>
          <option value="Thursday">Thursday</option>
          <option value="Friday">Friday</option>
        </select>
        <select class="availability-time">
          <option value="">Select Time</option>
          <option value="Anytime (8am - 9pm)">Anytime (8am - 9pm)</option>
          <option value="Morning (8am - 12pm)">Morning (8am - 12pm)</option>
          <option value="Afternoon (12pm - 5pm)">Afternoon (12pm - 5pm)</option>
          <option value="Evening (5pm - 9pm)">Evening (5pm - 9pm)</option>
        </select>
        <button type="button" class="btn-remove-row" title="Remove row">×</button>
      </div>
    `;

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
