<div align="center">

  <img src="icons/icon128.png" alt="Mono Audio Fixer Logo" width="96" height="96" style="border-radius: 20px; box-shadow: 0 8px 24px rgba(99, 102, 241, 0.35);" />

  # 🎧 YouTube & Tab Mono Audio Fixer

  **Fix YouTube videos where audio is only playing in one ear!**  
  *Downmix stereo to mono, route single-ear channels, balance audio, and boost volume per tab.*

  [![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-indigo.svg?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/intro/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com)
  [![Privacy First](https://img.shields.io/badge/Privacy-100%25%20Local-blue.svg?style=flat-square)](#-privacy--security)

</div>

---

## 😫 The Problem

Have you ever put on your favorite headphones to watch a YouTube tutorial, video essay, podcast, or lecture—only to find that **the sound is coming exclusively out of the left or right ear**?

This happens frequently when:
- Video creators use a mono microphone plugged into an audio interface that only records to Channel 1 (Left).
- Older or amateur videos have corrupted stereo panning.
- One audio channel has loud hum, buzz, or static while the other is clear.

Instead of messing with system-wide accessibility settings (which ruins your music and games in other apps), **Mono Audio Fixer** solves this instantly for individual browser tabs with a single click.

---

## ✨ Features

- 🎛️ **5 Powerful Audio Presets**:
  - **Mono Mix** (`50% L + 50% R`): Perfectly blends both channels into both ears.
  - **Left Only -> Both** (`100% L -> L & R`): When the right ear is completely dead or noisy, duplicates the clear left channel to both sides.
  - **Right Only -> Both** (`100% R -> L & R`): When the left ear is dead or noisy, duplicates the clear right channel to both sides.
  - **Swap L ↔ R**: Inverts stereo channels (great for backwards headphones or flipped spatial audio).
  - **Stereo Normal**: Instant 1-click bypass back to regular audio.
- 🔊 **Volume Booster**: Boost quiet or poorly recorded YouTube audio up to **300%** (3x gain) safely.
- ⚖️ **Stereo Balance Slider**: Fine-tune left-to-right panning balance with 1-click reset to center.
- ⚡ **Zero Lag & Low Overhead**: Native Web Audio API hardware acceleration with near-zero CPU footprint.
- 🔄 **YouTube SPA Ready**: Seamlessly keeps audio intact as you browse YouTube videos without page reload errors.
- ⌨️ **Keyboard Shortcut**: Press `Alt + Shift + M` to toggle mono mode instantly without even opening the popup.
- 🏷️ **Smart Tab Badge**: Displays clean, compact indicators (`ON`, `L`, `R`, `SW`) on the extension icon so you always know what mode is active.

---

## 🚀 Quick Install Guide (Takes 30 Seconds)

Since this extension is open-source, you can install it directly in **Google Chrome**, **Brave**, **Microsoft Edge**, **Opera**, or **Kiwi Browser (Android)** in seconds:

### Step 1: Download or Clone this Repository
Clone with Git:
```bash
git clone https://github.com/YOUR_USERNAME/mono-audio-fixer.git
```
*Or click the green **Code** button at the top of this GitHub page and select **Download ZIP**, then unzip it to your computer.*

### Step 2: Open Extensions in Your Browser
- In **Chrome / Brave**: Go to `chrome://extensions/`
- In **Edge**: Go to `edge://extensions/`
- In **Opera**: Go to `opera://extensions/`

### Step 3: Enable Developer Mode & Load
1. Turn on the **Developer mode** toggle in the top-right corner.
2. Click the **Load unpacked** button in the top-left corner.
3. Select the folder containing `manifest.json`.
4. 🎉 **Done!** Pin the extension to your toolbar and click it on any video!

---

## 🎮 How to Use

1. Navigate to any YouTube video (or any website with video/audio).
2. Click the **Mono Audio Fixer** icon in your browser toolbar (or press `Alt + Shift + M`).
3. Select the mode that matches your video's audio issue:
   - If audio is only in the left ear: Click **Left Only** or **Mono Mix**.
   - If audio is only in the right ear: Click **Right Only** or **Mono Mix**.
4. Adjust the **Volume Boost** or **Stereo Balance** slider if needed.

---

## 🏗️ Architecture & How It Works

Under the hood, Mono Audio Fixer uses a low-latency Web Audio API routing matrix:

```
[HTML5 Video / Audio Element]
             │
   (createMediaElementSource)
             ▼
  [ChannelSplitterNode (2)]
       │             │
   (Left In)    (Right In)
       ├───┬─────────┼───┐
       │   │         │   │
     [LL] [LR]     [RL] [RR]  <-- 4-Gain Routing Matrix
       │   │         │   │
       └───┼─────────┼───┘
           ▼         ▼
  [ChannelMergerNode (2)]
             │
    [StereoPannerNode]  <-- Balance Control
             │
     [Master GainNode]  <-- Volume Boost (up to 3x)
             │
    [ctx.destination]
             ▼
      (Your Headphones)
```

By dynamically adjusting the gain multipliers across the 4 matrix nodes, the extension can achieve instantaneous zero-latency channel swapping, single-channel duplication, or downmixing without re-initializing the audio hardware.

---

## 🔒 Privacy & Security

- **100% Local**: All audio processing happens purely inside your browser on your machine.
- **Zero Telemetry**: No analytics, no tracking, and no external network requests.
- **Open Source**: Full source code is visible and auditable right here on GitHub.

---

## 🛡️ Repository Notice & Personal Use

This repository is maintained as a **read-only release**. 

- **Security & Integrity**: Direct write or push access to this repository is restricted to the repository owner.
- **Customization**: If you would like to edit, tweak, or expand the extension for your own personal needs, you are welcome to **Fork**, **Clone**, or **Download** the source code.
- **Issues**: If you discover a bug or have a suggestion, feel free to open a GitHub Issue.

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.
