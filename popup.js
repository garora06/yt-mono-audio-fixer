// YouTube & Tab Mono Audio Fixer - Popup Logic

document.addEventListener('DOMContentLoaded', async () => {
  const masterToggle = document.getElementById('masterToggle');
  const presetBtns = document.querySelectorAll('.preset-btn');
  const balanceSlider = document.getElementById('balanceSlider');
  const balanceVal = document.getElementById('balanceVal');
  const resetBalance = document.getElementById('resetBalance');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeVal = document.getElementById('volumeVal');
  const domainLabel = document.getElementById('domainLabel');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  let activeTabId = null;
  let currentState = {
    enabled: true,
    mode: 'mono',
    balance: 0.0,
    volume: 1.0
  };

  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) {
    activeTabId = tab.id;
    try {
      const url = new URL(tab.url);
      domainLabel.innerText = url.hostname.replace('www.', '');
    } catch (e) {
      domainLabel.innerText = 'Active Tab';
    }

    // Try requesting state from content script
    chrome.tabs.sendMessage(activeTabId, { action: 'GET_STATE' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        // Content script might not be injected yet, try injecting it
        chrome.scripting.executeScript({
          target: { tabId: activeTabId },
          files: ['content.js']
        }, () => {
          // Retry requesting state
          chrome.tabs.sendMessage(activeTabId, { action: 'GET_STATE' }, (resp) => {
            if (resp && resp.state) {
              updateUI(resp.state, resp.hasMedia);
            } else {
              setOfflineStatus("Ready (No video playing)");
            }
          });
        });
      } else if (response && response.state) {
        updateUI(response.state, response.hasMedia);
      }
    });
  }

  function updateUI(state, hasMedia = true) {
    currentState = { ...currentState, ...state };

    // Master switch
    masterToggle.checked = currentState.enabled;

    // Mode preset buttons
    presetBtns.forEach(btn => {
      if (btn.dataset.mode === currentState.mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Balance slider
    const bal = parseFloat(currentState.balance) || 0.0;
    balanceSlider.value = bal;
    if (bal === 0) {
      balanceVal.innerText = 'Center';
    } else if (bal < 0) {
      balanceVal.innerText = `L ${Math.round(Math.abs(bal) * 100)}%`;
    } else {
      balanceVal.innerText = `R ${Math.round(bal * 100)}%`;
    }

    // Volume slider
    const vol = parseFloat(currentState.volume) || 1.0;
    volumeSlider.value = vol;
    volumeVal.innerText = `${Math.round(vol * 100)}%`;

    // Status indicator
    if (hasMedia) {
      statusDot.classList.remove('offline');
      statusText.innerText = 'Audio active in tab';
    } else {
      statusDot.classList.add('offline');
      statusText.innerText = 'Waiting for media player...';
    }
  }

  function setOfflineStatus(msg) {
    statusDot.classList.add('offline');
    statusText.innerText = msg;
  }

  function sendStateToTab() {
    if (!activeTabId) return;
    chrome.tabs.sendMessage(activeTabId, {
      action: 'SET_STATE',
      state: currentState
    }, (response) => {
      if (response && response.state) {
        updateUI(response.state, true);
      }
    });
  }

  // Master Toggle Change
  masterToggle.addEventListener('change', () => {
    currentState.enabled = masterToggle.checked;
    sendStateToTab();
  });

  // Preset Buttons Click
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentState.mode = btn.dataset.mode;
      currentState.enabled = true; // Auto enable on preset click
      sendStateToTab();
    });
  });

  // Balance Slider Input
  balanceSlider.addEventListener('input', () => {
    currentState.balance = parseFloat(balanceSlider.value);
    const bal = currentState.balance;
    if (bal === 0) {
      balanceVal.innerText = 'Center';
    } else if (bal < 0) {
      balanceVal.innerText = `L ${Math.round(Math.abs(bal) * 100)}%`;
    } else {
      balanceVal.innerText = `R ${Math.round(bal * 100)}%`;
    }
    sendStateToTab();
  });

  // Reset Balance Button
  resetBalance.addEventListener('click', () => {
    currentState.balance = 0.0;
    balanceSlider.value = 0.0;
    balanceVal.innerText = 'Center';
    sendStateToTab();
  });

  // Volume Slider Input
  volumeSlider.addEventListener('input', () => {
    currentState.volume = parseFloat(volumeSlider.value);
    volumeVal.innerText = `${Math.round(currentState.volume * 100)}%`;
    sendStateToTab();
  });
});