# Generated Standalone Release APK for YouTube_wr

This folder contains the **Standalone Release APK** for `YouTube_wr`.
The JavaScript bundle (`index.android.bundle`) and Hermes bytecode are **pre-packaged inside the APK**, allowing it to run completely offline without Metro or any USB/Wi-Fi connection to a development computer.

## Latest Build Information
- **Version:** `v1.7.0` (Build `34` / `versionCode: 34`)
- **Build Date:** October 9, 2026
- **SHA-256 Checksum:** `0e63a7f4a30b64225851f9aef7c3d3b4204a8989ba529677dd3293a1345def25`

## Built-in Features
- **Native Chromium Visibility Spoofing & Explicit Notification Action Routing (v1.6.5)**:
  - **Native Window Visibility Spoofing (`forceWebViewVisible`)**: Prevents Chromium's C++ layer (`AwContents` / `WebMediaPlayerImpl`) from pausing hardware media decoders on minimize by continuously asserting `View.VISIBLE` on the `WebView` container (`dispatchWindowVisibilityChanged` and reflection `onWindowVisibilityChanged`).
  - **Explicit Notification Action Routing**: Notification controls generate explicit `ACTION_PLAY` or `ACTION_PAUSE` intents matching physical playback state, completely eliminating toggle desynchronization.
  - **40ms In-Background Auto-Recovery**: If a video pauses in the background without explicit user pause command, it recovers playback within 40ms.
  - **Instant Native Wake-Up**: Evaluates playback wake-up commands at the native lifecycle transition points (`onUserLeaveHint`, `onPause`, `onStop`).
  - **Inverted Pause Whitelist**: `video.pause()` is strictly suppressed on minimize, blur, app switch, screen lock, and idle timeouts. Only explicit remote notification/headset commands, natural video conclusion (`video.ended`), or trusted taps directly on the onscreen Pause button (`isPauseButtonElement`) authorize a pause.
  - **Recommendation Thumbnail Immunity**: Swiping home across video recommendation cards (`ytm-media-item`, `a[href*="/watch"]`) never authorizes a pause.
  - **Toggle Trap Eradication**: Removed synthetic `.click()` invocations on `.ytp-play-button` toggle buttons in remote control handlers (`PLAY` / `PAUSE`), completely eliminating toggle inversion and the notification pause/play loop on reopen and double-minimize.
  - **Capture-Phase Window Blur Immunity**: Catches `blur` and `focusout` events at capture phase on `window` and `document` (`window.__windowHasBlur = true; window.__lastBlurTime = Date.now()`). Automatically suppresses all minimization, screen lock, and app-switch pauses in both `HTMLMediaElement.prototype.pause` and `player.pauseVideo()`.
  - **Full TouchEvent Navigation Filter**: Coordinates safely extracted across `touches`, `changedTouches`, and `clientY` (`clientY >= window.innerHeight - 95`) so gesture navigation lifts never stamp accidental user timestamps.
  - **Single Source of Truth for Notification Media State**: Eradicated conflicting `PLAYBACK_STATE_UPDATE` emissions from `navigator.mediaSession.playbackState`. Hardware `<video>` DOM events via `reportMediaState` are the sole source of truth, eliminating notification flickering and toggle oscillations on reopen & second minimize.
  - **Native Android Lifecycle Integration**: Synchronizes background and blur flags across `onUserLeaveHint()`, `onWindowFocusChanged(false)`, `onPause()`, and `onStop()` in `MainActivity` to lock background playback before Activity pause completes.
  - **Renderer Priority Policy**: Enforces `setRendererPriorityPolicy(RENDERER_PRIORITY_IMPORTANT, false)` to prevent Android from waiving renderer priority when hidden.
  - **IntersectionObserver Player Shield**: Proxies `IntersectionObserver` to shield the main player, ensuring YouTube's mobile viewport observer always receives `isIntersecting: true`.
  - **Page Lifecycle & Focus Eradication**: Suppresses `freeze`, `resume`, `pagehide`, `blur`, `focusout`, and `visibilitychange` events at `EventTarget` and `Document` levels.
  - **Non-Invasive Media Session Sync**: Periodic state reporting guarantees the notification controls stay synchronized without fighting YouTube's player.
- **Official Custom Logo (`logo/logo.png`)**: Applied as the app launcher icon, adaptive icon, splash screen, and in-app header branding.
- **Offline / Standalone Ready**: `index.android.bundle` is embedded directly into APK assets with Hermes AOT bytecode.
- **Enhanced AdShield Pro**:
  - **Tier 1 (Safe Data Neutralization)**: Deletes ad payloads at `document_start` across `ytInitialPlayerResponse`, `Response.prototype.json`, and `JSON.parse` to prevent player schema validation crashes.
  - **Tier 2 (Cosmetic Shielding)**: CSS suppression hides ad overlays, badges, and skip buttons instantly before DOM render.
  - **Tier 3 (Velocity Skipper & Debounce Lock)**: 16x accelerated ad skipping with a 150ms Exit Debounce Lock to eliminate audio pops and flickering between sequential ads.
- **Instant Video Playback Accelerator**:
  - Eliminates 300ms touch-to-click mobile delay on thumbnails and buttons (`touch-action: manipulation`).
  - Pre-warms DNS and preconnects to Google video and image CDNs (`googlevideo.com`, `i.ytimg.com`, `yt3.ggpht.com`).
  - Kicks cued thumbnail overlays immediately on navigation so videos start playing without delay.
- **Native Media Controls & Foreground Service**:
  - Direct native execution bypasses background WebView bridge suspension.
  - De-duplicated remote actions prevent double-toggle oscillations.
  - Full transport controls in notification drawer and lock screen: Play/Pause, Rewind 10s, Fast-Forward 10s, Next Track, Previous Track.
  - Back button minimization: Keeps background playback alive without killing the app.
- **Multi-Platform WebApps Hub & Instagram Shield**:
  - High-DPI 1080p video profile spoofing (`ig_pr=3`, `ig_vw=1080`, `ig_vh=1920`).
  - Fluid reel vertical scrolling and gesture handling without viewport zoom destruction.
  - Non-colliding floating dock button to keep external webapp navigation unobstructed.
  - Optional Desktop Mode toggle with desktop User-Agent.
- **Auto HD Quality Lock**: Enforces 1080p / 4K resolution across mobile and desktop player containers without interfering with startup buffering.
- **Zen Mode (Distraction-Free)**: Suppresses Shorts shelves, comment sections, related suggestions, and end screens.
- **Fullscreen & Screen Zoom Customization**: 16:9 Fit, Zoom to Fill, Stretch, fine-tuned stepper, and isolated 2-finger zoom gestures.

## APK Files
- `YouTube_wr-v1.7.0-b34.apk` (76.03 MB): Version and build-tagged release binary.
- `YouTube_wr-v1.7.0.apk` (76.03 MB): Version-tagged release binary.
- `YouTube_wr.apk` (76.03 MB): Latest stable release binary.
- `app-release.apk` (76.03 MB): Direct release binary.

## Installation Instructions
Install directly onto any Android phone:
```bash
adb install -r generated_apk/YouTube_wr-v1.7.0.apk
```
Or copy `YouTube_wr-v1.7.0.apk` (or `YouTube_wr.apk`) to your phone storage and tap to install!
