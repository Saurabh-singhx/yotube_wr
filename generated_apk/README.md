# Generated Standalone Release APK for YouTube_wr

This folder contains the **Standalone Release APK** for `YouTube_wr`.
The JavaScript bundle (`index.android.bundle`) and Hermes bytecode are **pre-packaged inside the APK**, allowing it to run completely offline without Metro or any USB/Wi-Fi connection to a development computer.

## Latest Build Information
- **Version:** `v1.1.1` (Build `5` / `versionCode: 5`)
- **Build Date:** October 6, 2026
- **SHA-256 Checksum:** `28a9451bb25a26be23977e1f841ed167782e0f418c31790510d42fbae7ad23ac`

## Built-in Features
- **Official Custom Logo (`logo/logo.png`)**: Applied as the app launcher icon, adaptive icon, splash screen, and in-app header branding.
- **Offline / Standalone Ready**: `index.android.bundle` is embedded directly into APK assets with Hermes AOT bytecode.
- **Background Playback & Native Media Controls**:
  - Direct native execution bypasses background WebView bridge suspension.
  - Native Android Audio Focus (`AUDIOFOCUS_GAIN`) prevents OS audio pipeline suspension on minimize/screen-off.
  - Headphone disconnect auto-pause (`ACTION_AUDIO_BECOMING_NOISY`).
  - Full transport controls in notification drawer and lock screen: Play/Pause, Rewind 10s, Fast-Forward 10s, Next Track, Previous Track.
  - Automatic task cleanup (`onTaskRemoved` & `setDeleteIntent`): Dismisses notification cleanly when app is swiped away.
  - Back button minimization: Keeps background playback alive without killing the app.
- **AdShield Pro v3.1**: Sub-frame ad detection, fast-forward 16x ad skipping, zero black screens, anti-adblock dialog dismissal.
- **Auto HD Quality Lock**: Enforces 1080p / 4K resolution across mobile and desktop player containers.
- **Zen Mode (Distraction-Free)**: Suppresses Shorts shelves, comment sections, related suggestions, and end screens.
- **WebApps Hub & Picture-in-Picture (PiP)**: Multitask across Instagram, X, Reddit, TikTok, Twitch with draggable floating video miniplayer.
- **Fullscreen & Screen Zoom Customization**: 16:9 Fit, Zoom to Fill (crops wide screen black bars), Stretch, fine-tuned stepper, 2-finger pinch gestures, and floating HUD overlay.

## APK Files
- `YouTube_wr-v1.1.1-b5.apk` (75.95 MB): Version and build-tagged release binary.
- `YouTube_wr-v1.1.1.apk` (75.95 MB): Version-tagged release binary.
- `YouTube_wr.apk` (75.95 MB): Latest stable release binary.
- `app-release.apk` (75.95 MB): Direct release binary.

## Installation Instructions
Install directly onto any Android phone:
```bash
adb install -r generated_apk/YouTube_wr.apk
```
Or copy `YouTube_wr.apk` (or `YouTube_wr-v1.1.0.apk`) to your phone storage and tap to install!
