// YouTube & Tab Mono Audio Fixer - Content Script
(function () {
  if (window.__monoAudioFixerInjected) return;
  window.__monoAudioFixerInjected = true;

  // Default state for current tab
  let currentState = {
    enabled: true,
    mode: 'stereo', // 'stereo', 'mono', 'left-only', 'right-only', 'swap'
    balance: 0.0,   // -1.0 (Left) to 1.0 (Right)
    volume: 1.0     // 0.0 to 3.0
  };

  // Active audio graphs mapped by media element
  const audioGraphs = new Map();

  // Load saved state for this hostname or global default
  const host = window.location.hostname;
  chrome.storage.local.get([`state_${host}`, 'global_state'], (res) => {
    const saved = res[`state_${host}`] || res['global_state'];
    if (saved) {
      currentState = { ...currentState, ...saved };
    }
    attachToAllMediaElements();
  });

  /**
   * Set up Web Audio API processing graph for a media element (<video> or <audio>)
   */
  function setupAudioGraph(element) {
    if (audioGraphs.has(element)) {
      return audioGraphs.get(element);
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;

      const ctx = new AudioCtx();
      const source = ctx.createMediaElementSource(element);
      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2);

      // Channel Gain Matrix
      // Splitter output 0 = Left, 1 = Right
      // Merger input 0 = Left speaker, 1 = Right speaker
      const gainLL = ctx.createGain(); // L -> L
      const gainLR = ctx.createGain(); // L -> R
      const gainRL = ctx.createGain(); // R -> L
      const gainRR = ctx.createGain(); // R -> R

      splitter.connect(gainLL, 0); gainLL.connect(merger, 0, 0);
      splitter.connect(gainLR, 0); gainLR.connect(merger, 0, 1);
      splitter.connect(gainRL, 1); gainRL.connect(merger, 0, 0);
      splitter.connect(gainRR, 1); gainRR.connect(merger, 0, 1);

      // Stereo Panner Node
      let panner = null;
      if (ctx.createStereoPanner) {
        panner = ctx.createStereoPanner();
      }

      // Master Gain Node for Volume Boost
      const masterGain = ctx.createGain();

      // Connect source -> splitter
      source.connect(splitter);

      // Connect merger -> panner (or masterGain) -> destination
      if (panner) {
        merger.connect(panner);
        panner.connect(masterGain);
      } else {
        merger.connect(masterGain);
      }
      masterGain.connect(ctx.destination);

      const graph = {
        ctx,
        source,
        splitter,
        merger,
        gainLL,
        gainLR,
        gainRL,
        gainRR,
        panner,
        masterGain
      };

      audioGraphs.set(element, graph);

      // Auto-resume on media play or user interaction if suspended
      const resumeAudio = () => {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      };

      element.addEventListener('play', resumeAudio);
      element.addEventListener('playing', resumeAudio);
      document.addEventListener('click', resumeAudio, { once: true });

      // Apply initial state
      applyGraphState(graph, currentState);

      return graph;
    } catch (err) {
      console.warn('[Mono Audio Fixer] Failed to hook media element:', err);
      return null;
    }
  }

  /**
   * Apply routing matrix, balance, and volume settings to a specific audio graph
   */
  function applyGraphState(graph, state) {
    if (!graph || !graph.ctx) return;

    if (graph.ctx.state === 'suspended') {
      graph.ctx.resume().catch(() => {});
    }

    if (!state.enabled) {
      // Normal Stereo Bypass
      graph.gainLL.gain.setValueAtTime(1.0, graph.ctx.currentTime);
      graph.gainLR.gain.setValueAtTime(0.0, graph.ctx.currentTime);
      graph.gainRL.gain.setValueAtTime(0.0, graph.ctx.currentTime);
      graph.gainRR.gain.setValueAtTime(1.0, graph.ctx.currentTime);
      if (graph.panner) graph.panner.pan.setValueAtTime(0.0, graph.ctx.currentTime);
      graph.masterGain.gain.setValueAtTime(1.0, graph.ctx.currentTime);
      return;
    }

    // Configure Matrix Gains according to selected mode
    switch (state.mode) {
      case 'mono':
        // Downmix: 50% L + 50% R to both ears
        graph.gainLL.gain.setValueAtTime(0.5, graph.ctx.currentTime);
        graph.gainLR.gain.setValueAtTime(0.5, graph.ctx.currentTime);
        graph.gainRL.gain.setValueAtTime(0.5, graph.ctx.currentTime);
        graph.gainRR.gain.setValueAtTime(0.5, graph.ctx.currentTime);
        break;

      case 'left-only':
        // Duplicate Left channel to both ears (Right channel muted)
        graph.gainLL.gain.setValueAtTime(1.0, graph.ctx.currentTime);
        graph.gainLR.gain.setValueAtTime(1.0, graph.ctx.currentTime);
        graph.gainRL.gain.setValueAtTime(0.0, graph.ctx.currentTime);
        graph.gainRR.gain.setValueAtTime(0.0, graph.ctx.currentTime);
        break;

      case 'right-only':
        // Duplicate Right channel to both ears (Left channel muted)
        graph.gainLL.gain.setValueAtTime(0.0, graph.ctx.currentTime);
        graph.gainLR.gain.setValueAtTime(0.0, graph.ctx.currentTime);
        graph.gainRL.gain.setValueAtTime(1.0, graph.ctx.currentTime);
        graph.gainRR.gain.setValueAtTime(1.0, graph.ctx.currentTime);
        break;

      case 'swap':
        // Swap Left and Right channels
        graph.gainLL.gain.setValueAtTime(0.0, graph.ctx.currentTime);
        graph.gainLR.gain.setValueAtTime(1.0, graph.ctx.currentTime);
        graph.gainRL.gain.setValueAtTime(1.0, graph.ctx.currentTime);
        graph.gainRR.gain.setValueAtTime(0.0, graph.ctx.currentTime);
        break;

      case 'stereo':
      default:
        // Standard Stereo
        graph.gainLL.gain.setValueAtTime(1.0, graph.ctx.currentTime);
        graph.gainLR.gain.setValueAtTime(0.0, graph.ctx.currentTime);
        graph.gainRL.gain.setValueAtTime(0.0, graph.ctx.currentTime);
        graph.gainRR.gain.setValueAtTime(1.0, graph.ctx.currentTime);
        break;
    }

    // Set Balance (-1.0 to +1.0)
    if (graph.panner) {
      const panVal = Math.max(-1.0, Math.min(1.0, parseFloat(state.balance) || 0.0));
      graph.panner.pan.setValueAtTime(panVal, graph.ctx.currentTime);
    }

    // Set Master Volume Boost (0.0 to 3.0)
    const volVal = Math.max(0.0, Math.min(3.0, parseFloat(state.volume) || 1.0));
    graph.masterGain.gain.setValueAtTime(volVal, graph.ctx.currentTime);
  }

  /**
   * Apply current settings to all media elements on the page
   */
  function updateAllMediaElements() {
    const mediaElements = document.querySelectorAll('video, audio');
    mediaElements.forEach((el) => {
      let graph = audioGraphs.get(el);
      if (!graph) {
        graph = setupAudioGraph(el);
      }
      if (graph) {
        applyGraphState(graph, currentState);
      }
    });

    // Notify background script to update badge
    chrome.runtime.sendMessage({
      action: 'UPDATE_BADGE',
      state: currentState
    }).catch(() => {});
  }

  function attachToAllMediaElements() {
    updateAllMediaElements();
  }

  // Monitor DOM changes for dynamic videos (YouTube SPA, player reloads)
  const observer = new MutationObserver((mutations) => {
    let hasNewMedia = false;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) {
          if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO' || node.querySelector?.('video, audio')) {
            hasNewMedia = true;
            break;
          }
        }
      }
      if (hasNewMedia) break;
    }
    if (hasNewMedia) {
      updateAllMediaElements();
    }
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });

  // Listen for YouTube SPA navigation events
  window.addEventListener('yt-navigate-finish', () => {
    setTimeout(updateAllMediaElements, 500);
  });

  // Periodically check for unhooked videos (safeguard)
  setInterval(() => {
    const unhooked = Array.from(document.querySelectorAll('video, audio')).filter(el => !audioGraphs.has(el));
    if (unhooked.length > 0) {
      updateAllMediaElements();
    }
  }, 2000);

  // Handle messages from Popup or Background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_STATE') {
      sendResponse({
        state: currentState,
        hasMedia: document.querySelectorAll('video, audio').length > 0
      });
      return true;
    }

    if (request.action === 'SET_STATE') {
      currentState = { ...currentState, ...request.state };
      
      // Save state to storage
      const host = window.location.hostname;
      const saveObj = {};
      saveObj[`state_${host}`] = currentState;
      saveObj['global_state'] = currentState;
      chrome.storage.local.set(saveObj);

      updateAllMediaElements();
      sendResponse({ success: true, state: currentState });
      return true;
    }

    if (request.action === 'TOGGLE_MONO') {
      if (currentState.mode === 'mono') {
        currentState.mode = 'stereo';
      } else {
        currentState.mode = 'mono';
      }
      currentState.enabled = true;

      const host = window.location.hostname;
      const saveObj = {};
      saveObj[`state_${host}`] = currentState;
      saveObj['global_state'] = currentState;
      chrome.storage.local.set(saveObj);

      updateAllMediaElements();
      sendResponse({ success: true, state: currentState });
      return true;
    }
  });
})();
