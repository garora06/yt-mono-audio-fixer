// ==UserScript==
// @name         Mono Audio Fixer for Safari (YouTube & Web)
// @namespace    https://github.com/garora06/mono-audio-fixer
// @version      1.0.0
// @description  Fix single-ear YouTube videos in Safari (macOS & iOS) by downmixing stereo to mono or copying left/right channels.
// @author       garora06
// @match        *://*.youtube.com/*
// @match        *://youtube.com/*
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';
  if (window.__monoAudioFixerUserscriptInjected) return;
  window.__monoAudioFixerUserscriptInjected = true;

  const audioGraphs = new Map();
  let currentMode = 'mono'; // 'mono', 'left-only', 'right-only', 'stereo'
  let isEnabled = true;

  function setupAudioGraph(element) {
    if (audioGraphs.has(element)) return audioGraphs.get(element);

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;

      const ctx = new AudioCtx();
      const source = ctx.createMediaElementSource(element);
      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2);

      const gainLL = ctx.createGain();
      const gainLR = ctx.createGain();
      const gainRL = ctx.createGain();
      const gainRR = ctx.createGain();

      splitter.connect(gainLL, 0); gainLL.connect(merger, 0, 0);
      splitter.connect(gainLR, 0); gainLR.connect(merger, 0, 1);
      splitter.connect(gainRL, 1); gainRL.connect(merger, 0, 0);
      splitter.connect(gainRR, 1); gainRR.connect(merger, 0, 1);

      merger.connect(ctx.destination);

      const graph = { ctx, gainLL, gainLR, gainRL, gainRR };
      audioGraphs.set(element, graph);

      const resumeAudio = () => {
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      };
      element.addEventListener('play', resumeAudio);
      document.addEventListener('click', resumeAudio, { once: true });

      applyGraphState(graph);
      return graph;
    } catch (e) {
      return null;
    }
  }

  function applyGraphState(graph) {
    if (!graph || !graph.ctx) return;
    if (graph.ctx.state === 'suspended') graph.ctx.resume().catch(() => {});

    if (!isEnabled || currentMode === 'stereo') {
      graph.gainLL.gain.setValueAtTime(1.0, graph.ctx.currentTime);
      graph.gainLR.gain.setValueAtTime(0.0, graph.ctx.currentTime);
      graph.gainRL.gain.setValueAtTime(0.0, graph.ctx.currentTime);
      graph.gainRR.gain.setValueAtTime(1.0, graph.ctx.currentTime);
      return;
    }

    switch (currentMode) {
      case 'mono':
        graph.gainLL.gain.setValueAtTime(0.5, graph.ctx.currentTime);
        graph.gainLR.gain.setValueAtTime(0.5, graph.ctx.currentTime);
        graph.gainRL.gain.setValueAtTime(0.5, graph.ctx.currentTime);
        graph.gainRR.gain.setValueAtTime(0.5, graph.ctx.currentTime);
        break;
      case 'left-only':
        graph.gainLL.gain.setValueAtTime(1.0, graph.ctx.currentTime);
        graph.gainLR.gain.setValueAtTime(1.0, graph.ctx.currentTime);
        graph.gainRL.gain.setValueAtTime(0.0, graph.ctx.currentTime);
        graph.gainRR.gain.setValueAtTime(0.0, graph.ctx.currentTime);
        break;
      case 'right-only':
        graph.gainLL.gain.setValueAtTime(0.0, graph.ctx.currentTime);
        graph.gainLR.gain.setValueAtTime(0.0, graph.ctx.currentTime);
        graph.gainRL.gain.setValueAtTime(1.0, graph.ctx.currentTime);
        graph.gainRR.gain.setValueAtTime(1.0, graph.ctx.currentTime);
        break;
    }
  }

  function updateAllMedia() {
    document.querySelectorAll('video, audio').forEach(el => {
      let g = audioGraphs.get(el) || setupAudioGraph(el);
      if (g) applyGraphState(g);
    });
  }

  // Floating Safari UI Pill
  function createFloatingButton() {
    if (document.getElementById('monoFixerSafariPill')) return;

    const pill = document.createElement('div');
    pill.id = 'monoFixerSafariPill';
    pill.innerHTML = `
      <div style="
        position: fixed; bottom: 20px; right: 20px; z-index: 999999;
        background: #0f172a; color: #fff; font-family: -apple-system, sans-serif;
        padding: 8px 12px; border-radius: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.5);
        display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600;
        border: 1px solid rgba(255,255,255,0.15); cursor: pointer; user-select: none;
      ">
        <span id="monoFixerIcon" style="color: #818cf8;">🎧</span>
        <span id="monoFixerText">Mono: ON</span>
      </div>
    `;

    pill.addEventListener('click', () => {
      if (currentMode === 'mono') {
        currentMode = 'left-only';
        document.getElementById('monoFixerText').innerText = 'Left Only';
        document.getElementById('monoFixerIcon').style.color = '#ec4899';
      } else if (currentMode === 'left-only') {
        currentMode = 'right-only';
        document.getElementById('monoFixerText').innerText = 'Right Only';
        document.getElementById('monoFixerIcon').style.color = '#06b6d4';
      } else if (currentMode === 'right-only') {
        currentMode = 'stereo';
        document.getElementById('monoFixerText').innerText = 'Stereo (Off)';
        document.getElementById('monoFixerIcon').style.color = '#94a3b8';
      } else {
        currentMode = 'mono';
        document.getElementById('monoFixerText').innerText = 'Mono: ON';
        document.getElementById('monoFixerIcon').style.color = '#818cf8';
      }
      updateAllMedia();
    });

    document.body.appendChild(pill);
  }

  // Init
  setTimeout(() => {
    updateAllMedia();
    createFloatingButton();
  }, 1000);

  // Keyboard shortcut: Alt+Shift+M
  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && e.code === 'KeyM') {
      currentMode = (currentMode === 'mono') ? 'stereo' : 'mono';
      updateAllMedia();
      const txt = document.getElementById('monoFixerText');
      if (txt) txt.innerText = (currentMode === 'mono') ? 'Mono: ON' : 'Stereo (Off)';
    }
  });

  // Watch for dynamic video changes
  new MutationObserver(updateAllMedia).observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });
})();
