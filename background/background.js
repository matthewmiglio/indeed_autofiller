// Indeed Autofiller - Background Service Worker
// Handles keyboard shortcuts and extension lifecycle

// Listen for keyboard shortcut command
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'trigger-autofill') {
    try {
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab?.url?.includes('indeed.com')) {
        console.log('Indeed Autofiller: Not on Indeed.com');
        return;
      }

      // Send message to content script
      await chrome.tabs.sendMessage(tab.id, { action: 'autofill' });
      console.log('Indeed Autofiller: Autofill triggered via keyboard shortcut');
    } catch (error) {
      console.error('Indeed Autofiller: Error triggering autofill', error);
    }
  }
});

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Indeed Autofiller: Extension installed');

    // Set default settings
    chrome.storage.sync.set({
      showNotification: true,
      autoFillDate: true,
      fillDemographics: false,
      autoFillOnLoad: false
    });
  } else if (details.reason === 'update') {
    console.log('Indeed Autofiller: Extension updated to version', chrome.runtime.getManifest().version);
  }
});

// Log when service worker starts
console.log('Indeed Autofiller: Background service worker started');
