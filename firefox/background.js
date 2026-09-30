// YouTube & Tab Mono Audio Fixer - Background Service Worker

/**
 * Updates extension action badge based on active audio mode
 */
function updateBadge(tabId, state) {
  if (!state || !state.enabled || state.mode === 'stereo') {
    chrome.action.setBadgeText({ tabId, text: '' });
    return;
  }

  let text = '';
  let color = '#6366f1'; // Default Indigo

  switch (state.mode) {
    case 'mono':
      text = 'ON';
      color = '#6366f1'; // Indigo
      break;
    case 'left-only':
      text = 'L';
      color = '#ec4899'; // Pink
      break;
    case 'right-only':
      text = 'R';
      color = '#06b6d4'; // Cyan
      break;
    case 'swap':
      text = 'SW';
      color = '#f59e0b'; // Amber
      break;
  }

  chrome.action.setBadgeText({ tabId, text });
  chrome.action.setBadgeBackgroundColor({ tabId, color });
  if (chrome.action.setBadgeTextColor) {
    chrome.action.setBadgeTextColor({ tabId, color: '#ffffff' });
  }
}

// Handle runtime messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'UPDATE_BADGE' && sender.tab) {
    updateBadge(sender.tab.id, message.state);
    sendResponse({ success: true });
  }
  return true;
});

// Handle extension keyboard hotkeys (Alt+Shift+M)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-mono') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_MONO' }, (res) => {
        if (res && res.state) {
          updateBadge(tab.id, res.state);
        }
      });
    }
  }
});
