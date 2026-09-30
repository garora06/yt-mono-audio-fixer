// Mono Audio Fixer Landing Page - Interactive Simulator & Visualizer

document.addEventListener('DOMContentLoaded', () => {
  // Web Audio Context & Nodes
  let audioCtx = null;
  let isPlaying = false;
  let synthInterval = null;

  // Nodes for processing
  let splitter = null;
  let merger = null;
  let gainLL = null;
  let gainLR = null;
  let gainRL = null;
  let gainRR = null;
  let panner = null;
  let masterGain = null;
  let analyserL = null;
  let analyserR = null;

  // Canvas visualizer
  const canvas = document.getElementById('audioVisualizer');
  const canvasCtx = canvas.getContext('2d');
  const meterL = document.getElementById('meterL');
  const meterR = document.getElementById('meterR');
  const demoStatus = document.getElementById('demoStatus');

  // Sliders & Controls
  const demoBalance = document.getElementById('demoBalance');
  const demoBalanceVal = document.getElementById('demoBalanceVal');
  const demoVolume = document.getElementById('demoVolume');
  const demoVolumeVal = document.getElementById('demoVolumeVal');
  const presetPills = document.querySelectorAll('.preset-pill');

  let currentMode = 'mono';
  let currentBrokenState = 'left'; // 'left', 'right', 'stereo'

  function initAudio() {
    if (audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    splitter = audioCtx.createChannelSplitter(2);
    merger = audioCtx.createChannelMerger(2);

    // 4-gain routing matrix (same as extension)
    gainLL = audioCtx.createGain();
    gainLR = audioCtx.createGain();
    gainRL = audioCtx.createGain();
    gainRR = audioCtx.createGain();

    splitter.connect(gainLL, 0); gainLL.connect(merger, 0, 0);
    splitter.connect(gainLR, 0); gainLR.connect(merger, 0, 1);
    splitter.connect(gainRL, 1); gainRL.connect(merger, 0, 0);
    splitter.connect(gainRR, 1); gainRR.connect(merger, 0, 1);

    panner = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
    masterGain = audioCtx.createGain();

    // Final output splitters for L/R visualizer analysis
    const outSplitter = audioCtx.createChannelSplitter(2);
    analyserL = audioCtx.createAnalyser();
    analyserR = audioCtx.createAnalyser();
    analyserL.fftSize = 256;
    analyserR.fftSize = 256;

    if (panner) {
      merger.connect(panner);
      panner.connect(masterGain);
    } else {
      merger.connect(masterGain);
    }

    masterGain.connect(outSplitter);
    outSplitter.connect(analyserL, 0);
    outSplitter.connect(analyserR, 1);

    masterGain.connect(audioCtx.destination);

    applyMatrixSettings();
    drawVisualizer();
  }

  function applyMatrixSettings() {
    if (!audioCtx) return;

    // Apply Mode Matrix
    switch (currentMode) {
      case 'mono':
        gainLL.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainLR.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainRL.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainRR.gain.setValueAtTime(0.5, audioCtx.currentTime);
        break;

      case 'left-only':
        gainLL.gain.setValueAtTime(1.0, audioCtx.currentTime);
        gainLR.gain.setValueAtTime(1.0, audioCtx.currentTime);
        gainRL.gain.setValueAtTime(0.0, audioCtx.currentTime);
        gainRR.gain.setValueAtTime(0.0, audioCtx.currentTime);
        break;

      case 'right-only':
        gainLL.gain.setValueAtTime(0.0, audioCtx.currentTime);
        gainLR.gain.setValueAtTime(0.0, audioCtx.currentTime);
        gainRL.gain.setValueAtTime(1.0, audioCtx.currentTime);
        gainRR.gain.setValueAtTime(1.0, audioCtx.currentTime);
        break;

      case 'swap':
        gainLL.gain.setValueAtTime(0.0, audioCtx.currentTime);
        gainLR.gain.setValueAtTime(1.0, audioCtx.currentTime);
        gainRL.gain.setValueAtTime(1.0, audioCtx.currentTime);
        gainRR.gain.setValueAtTime(0.0, audioCtx.currentTime);
        break;

      case 'stereo':
      default:
        gainLL.gain.setValueAtTime(1.0, audioCtx.currentTime);
        gainLR.gain.setValueAtTime(0.0, audioCtx.currentTime);
        gainRL.gain.setValueAtTime(0.0, audioCtx.currentTime);
        gainRR.gain.setValueAtTime(1.0, audioCtx.currentTime);
        break;
    }

    // Apply Balance
    if (panner) {
      panner.pan.setValueAtTime(parseFloat(demoBalance.value) || 0, audioCtx.currentTime);
    }

    // Apply Volume
    masterGain.gain.setValueAtTime(parseFloat(demoVolume.value) || 1.0, audioCtx.currentTime);
  }

  // Synthesize musical tones with stereo placement
  const pentatonicScale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
  let noteIndex = 0;

  function playTone(freq, panPos) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const noteGain = audioCtx.createGain();
    const notePanner = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    noteGain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    noteGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

    if (notePanner) {
      notePanner.pan.setValueAtTime(panPos, audioCtx.currentTime);
      osc.connect(noteGain);
      noteGain.connect(notePanner);
      notePanner.connect(splitter);
    } else {
      osc.connect(noteGain);
      noteGain.connect(splitter);
    }

    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  }

  function startAudioLoop(type) {
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    stopAudioLoop();
    isPlaying = true;
    currentBrokenState = type;

    let pan = -1.0; // Left
    if (type === 'right') pan = 1.0; // Right
    else if (type === 'stereo') pan = 0.0;

    synthInterval = setInterval(() => {
      const freq = pentatonicScale[noteIndex % pentatonicScale.length];
      noteIndex++;

      let curPan = pan;
      if (type === 'stereo') {
        // Alternate between left and right in stereo
        curPan = (noteIndex % 2 === 0) ? -0.7 : 0.7;
      }
      playTone(freq, curPan);
    }, 280);

    updateStatusMessage();
  }

  function stopAudioLoop() {
    if (synthInterval) {
      clearInterval(synthInterval);
      synthInterval = null;
    }
    isPlaying = false;
  }

  function updateStatusMessage() {
    if (!isPlaying) {
      demoStatus.innerText = '🎧 Wear headphones for the best experience. Click a test sound to begin!';
      return;
    }

    let sourceDesc = '';
    if (currentBrokenState === 'left') sourceDesc = 'Broken audio (LEFT EAR ONLY)';
    else if (currentBrokenState === 'right') sourceDesc = 'Broken audio (RIGHT EAR ONLY)';
    else sourceDesc = 'Stereo source audio';

    let fixDesc = '';
    if (currentMode === 'mono') fixDesc = 'Fixed! Blended into both ears (Mono Mix).';
    else if (currentMode === 'left-only') fixDesc = 'Fixed! Left channel duplicated to both ears.';
    else if (currentMode === 'right-only') fixDesc = 'Fixed! Right channel duplicated to both ears.';
    else if (currentMode === 'swap') fixDesc = 'Channels swapped!';
    else fixDesc = 'Stereo bypass active (unaltered).';

    demoStatus.innerHTML = `<strong>Playing:</strong> ${sourceDesc} ➔ <strong>Result:</strong> ${fixDesc}`;
  }

  // Draw Audio Visualizer Waves & Peak Meters
  function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);

    const width = canvas.width;
    const height = canvas.height;
    canvasCtx.clearRect(0, 0, width, height);

    if (!analyserL || !analyserR) return;

    const dataL = new Uint8Array(analyserL.frequencyBinCount);
    const dataR = new Uint8Array(analyserR.frequencyBinCount);

    analyserL.getByteTimeDomainData(dataL);
    analyserR.getByteTimeDomainData(dataR);

    // Compute Peak RMS for meters
    let sumL = 0, sumR = 0;
    for (let i = 0; i < dataL.length; i++) {
      const vL = (dataL[i] - 128) / 128;
      const vR = (dataR[i] - 128) / 128;
      sumL += vL * vL;
      sumR += vR * vR;
    }
    const rmsL = Math.min(100, Math.round(Math.sqrt(sumL / dataL.length) * 350));
    const rmsR = Math.min(100, Math.round(Math.sqrt(sumR / dataR.length) * 350));

    meterL.style.height = `${rmsL}%`;
    meterR.style.height = `${rmsR}%`;

    // Draw Left Channel Waveform (Cyan)
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = '#38bdf8';
    canvasCtx.beginPath();
    let sliceWidth = width / dataL.length;
    let x = 0;
    for (let i = 0; i < dataL.length; i++) {
      let v = dataL[i] / 128.0;
      let y = (v * height) / 2 - 10;
      if (i === 0) canvasCtx.moveTo(x, y);
      else canvasCtx.lineTo(x, y);
      x += sliceWidth;
    }
    canvasCtx.stroke();

    // Draw Right Channel Waveform (Pink)
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = '#f472b6';
    canvasCtx.beginPath();
    x = 0;
    for (let i = 0; i < dataR.length; i++) {
      let v = dataR[i] / 128.0;
      let y = (v * height) / 2 + 10;
      if (i === 0) canvasCtx.moveTo(x, y);
      else canvasCtx.lineTo(x, y);
      x += sliceWidth;
    }
    canvasCtx.stroke();
  }

  // Button Listeners
  document.getElementById('btnBrokenLeft').addEventListener('click', () => {
    startAudioLoop('left');
  });

  document.getElementById('btnBrokenRight').addEventListener('click', () => {
    startAudioLoop('right');
  });

  document.getElementById('btnNormalStereo').addEventListener('click', () => {
    startAudioLoop('stereo');
  });

  document.getElementById('btnStopAudio').addEventListener('click', () => {
    stopAudioLoop();
    demoStatus.innerText = 'Audio stopped. Click a test sound to play again.';
    meterL.style.height = '0%';
    meterR.style.height = '0%';
  });

  // Preset Pills Click
  presetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      presetPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentMode = pill.dataset.mode;
      applyMatrixSettings();
      updateStatusMessage();
    });
  });

  // Sliders
  demoBalance.addEventListener('input', () => {
    const val = parseFloat(demoBalance.value);
    if (val === 0) demoBalanceVal.innerText = 'Center';
    else if (val < 0) demoBalanceVal.innerText = `L ${Math.round(Math.abs(val) * 100)}%`;
    else demoBalanceVal.innerText = `R ${Math.round(val * 100)}%`;
    applyMatrixSettings();
  });

  demoVolume.addEventListener('input', () => {
    const val = parseFloat(demoVolume.value);
    demoVolumeVal.innerText = `${Math.round(val * 100)}%`;
    applyMatrixSettings();
  });

  // Copy Clone Command
  const copyBtn = document.getElementById('copyBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const code = 'git clone https://github.com/YOUR_USERNAME/mono-audio-fixer.git';
      navigator.clipboard.writeText(code).then(() => {
        copyBtn.innerText = 'Copied!';
        setTimeout(() => { copyBtn.innerText = 'Copy'; }, 2000);
      });
    });
  }

  // FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      faqItems.forEach(i => i.classList.remove('open'));
      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });
});
