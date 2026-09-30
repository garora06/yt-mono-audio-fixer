# Safari Support for Mono Audio Fixer (macOS & iOS)

Apple Safari requires extensions to either be converted into an Xcode App Extension or run via a lightweight userscript runner.

---

## Method 1: Instant 1-Click Setup with Userscripts (Recommended for macOS & iOS)

You can run **Mono Audio Fixer** directly on Safari (Mac, iPhone, and iPad) without Xcode or an Apple Developer account:

1. Install the free, open-source **[Userscripts](https://apps.apple.com/app/userscripts/id1463298887)** extension from the Mac App Store or iOS App Store.
2. Open Safari and enable the **Userscripts** extension in Safari Settings.
3. Open `safari/mono-audio-fixer.user.js` and click **Install**.
4. 🎉 **Done!** Open any YouTube video. You'll see a floating 🎧 **Mono Audio** toggle pill in the bottom-right corner, and you can also press `Alt + Shift + M` on Mac!

---

## Method 2: Native Safari Web Extension (Xcode App Container)

If you have Xcode installed on macOS and want to compile a native `.app` extension:

1. Ensure Xcode is installed from the Mac App Store.
2. In terminal, navigate to this project folder and run:
   ```bash
   xcrun safari-web-extension-converter . --project-location ./safari-build --app-name "MonoAudioFixer"
   ```
3. Open the generated Xcode project in `./safari-build` and click **Run**.
4. In Safari, go to **Settings** → **Advanced** → Check **"Show features for web developers"**.
5. In the **Develop** menu, check **"Allow Unsigned Extensions"**.
6. Enable **MonoAudioFixer** in Safari Settings → Extensions!
