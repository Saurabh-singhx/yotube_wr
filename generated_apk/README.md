# Generated Standalone Release APK for YouTube_wr

This folder contains the **Standalone Release APK** for `YouTube_wr`.
The JavaScript bundle (`index.android.bundle`) and Hermes bytecode are **pre-packaged inside the APK**, allowing it to run completely offline without Metro or any USB/Wi-Fi connection to a development computer.

## Built-in Features
- **Official Custom Logo (`logo/logo.png`)**: Applied as the app launcher icon, adaptive icon, splash screen, and in-app header branding.
- **Offline / Standalone Ready**: `index.android.bundle` is embedded directly into APK assets with Hermes AOT bytecode.
- **AdShield Pro v3.1**: Sub-frame ad detection, fast-forward 16x ad skipping, zero black screens, anti-adblock dialog dismissal.
- **Auto HD Quality Lock**: Enforces 1080p / 4K resolution across mobile and desktop player containers.
- **Zen Mode (Distraction-Free)**: Suppresses Shorts shelves, comment sections, related suggestions, and end screens.
- **WebApps Hub & Picture-in-Picture (PiP)**: Multitask across Instagram, X, Reddit, TikTok, Twitch with draggable floating video miniplayer.
- **Fullscreen & Screen Zoom Customization**: 16:9 Fit, Zoom to Fill (crops wide screen black bars), Stretch, fine-tuned stepper, 2-finger pinch gestures, and floating HUD overlay.

## APK Files
- `YouTube_wr.apk` (76 MB): Signed standalone release APK.
- `app-release.apk` (76 MB): Direct release binary.

## Installation Instructions
Install directly onto any Android phone:
```bash
adb install -r generated_apk/YouTube_wr.apk
```
Or copy `YouTube_wr.apk` to your phone storage and tap to install!
