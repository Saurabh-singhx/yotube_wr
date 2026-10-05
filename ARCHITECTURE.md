# YouTube_wr — Architecture & Technical Design Document

> **Document Version:** 1.1.0  
> **Status:** Active / Living Document  
> **Last Updated:** October 2026  
> **Maintainer:** YouTube_wr Engineering Team  

---

## 1. Executive Summary & Philosophy

`YouTube_wr` is a modern mobile YouTube client designed to combine the flexibility of YouTube's web platform with native mobile enhancements:
1. **Uncompromised Ad & Tracker Blocking:** Complete removal of video pre-roll/mid-roll ads, sponsored feed banners, search ads, and Google telemetry without black screen stalls or playback freezes.
2. **Pluggable Extension Architecture:** A modular, Userscript-inspired extension engine that allows both pre-compiled and user-defined scripts/styles to run seamlessly in the web sandbox.
3. **Tactile Neumorphic (Soft UI) Interface:** A cohesive visual design language employing dual-light elevation, concave pressed states, and spring-driven controls that deliver a unique tactile feel.
4. **Resilience to YouTube Web Changes:** By separating UI customization, script injection, and native controls into decoupled layers, upstream YouTube DOM updates can be accommodated simply by updating extension rules rather than rebuilding the entire native binary.

---

## 2. Technology Stack — What We Used & Why

| Component | Technology | Rationale & Alternatives Considered |
| :--- | :--- | :--- |
| **Framework** | **Expo SDK 57 / React Native 0.86** | Provides high-performance Continuous Native Generation (CNG), cross-platform mobile rendering, and access to modern native hardware APIs (Haptics, Status Bar, Safe Area) without Xcode/Android Studio manual configuration overhead. |
| **Language** | **TypeScript 5.x / 6.x (Strict)** | Guarantees type safety across extension manifests, setting schemas, bridge events, and neumorphic style contracts. |
| **Browser Engine** | **`react-native-webview` (v13.x)** | Chosen over building a custom Chromium/Gecko fork (which would add ~150MB to app size and face severe App Store rejections) and over native video players (which frequently break when YouTube alters stream cipher signatures). WebViews receive native platform hardware acceleration, full HTML5 video support, and two-way script injection capabilities. |
| **Design Language** | **Neumorphism (Soft UI)** | Chosen over standard Material or Flat design to provide an elevated, modern tactile experience suited for audio/video media controls (e.g., sunken inputs, extruded knobs, tactile haptic toggles). |
| **Storage Engine** | **`@react-native-async-storage`** | Lightweight, key-value asynchronous storage without native database dependencies (SQLite/Realm), ideal for saving extension manifests, user configurations, theme preferences, and ad-blocking statistics. |
| **Haptics** | **`expo-haptics`** | Provides tactile feedback on button presses, search actions, and switch toggles, enhancing the neumorphic physical feel. |

---

## 3. High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React Native Application Layer                   │
│                                                                        │
│   ┌───────────────────────┐  ┌─────────────────────────────────────┐  │
│   │   TopHeader (Nav/Logo)│  │   BottomDock (Home, Search, Zen)    │  │
│   └───────────┬───────────┘  └──────────────────┬──────────────────┘  │
│               │                                 │                      │
│   ┌───────────▼─────────────────────────────────▼──────────────────┐  │
│   │        ExtensionContext & ThemeContext State Manager            │  │
│   │   • Extension Registry  • Settings  • AdBlock Stats  • Theme    │  │
│   └───────────┬─────────────────────────────────┬──────────────────┘  │
│               │                                 │                      │
│   ┌───────────▼───────────┐         ┌───────────▼──────────────────┐  │
│   │    ExtensionEngine    │         │  AsyncStorage Persistence    │  │
│   │  • Script Compiler    │         │  • Enabled extensions        │  │
│   │  • CSS Builder        │         │  • Custom userscripts        │  │
│   │  • Bridge Dispatcher  │         │  • Live blocking statistics  │  │
│   └───────────┬───────────┘         └──────────────────────────────┘  │
└───────────────┼────────────────────────────────────────────────────────┘
                │ Injected Scripts & CSS / PostMessage Bridge
┌───────────────▼────────────────────────────────────────────────────────┐
│                      WebView Execution Sandbox                         │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │  Document Start: window.__RN_EXTENSION_BRIDGE__                │   │
│   │  • Monkey-patch fetch() & XMLHttpRequest.prototype.open/send   │   │
│   │  • Intercept & drop external Google Ad domains                 │   │
│   │  • Scrub player JSON (strip adPlacements & playerAds)          │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
│                                    │                                   │
│   ┌────────────────────────────────▼───────────────────────────────┐   │
│   │  DOM / Content Ready: Style & Script Runner                    │   │
│   │  • Inject combined CSS (<style id="__rn_extension_styles__">)  │   │
│   │  • Bulletproof Video Ad Skipper (Fast-forward, skip, unmute)   │   │
│   │  • Zen Focus (Shorts & comments blocker)                       │   │
│   │  • SPA Hook: Re-apply on 'yt-navigate-finish' & 'popstate'     │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Multi-Layer AdBlocker & Black Screen Resolution

### The "Black Screen" Problem Analyzed

Through extensive research across GitHub repositories (including `uBlockOrigin/uAssets`, `TheRealJoelmatic/RemoveAdblockThing`, and `0x48piraj/fadblock`), the infamous YouTube ad blocker "black screen" or "5-second stall" is caused by three distinct issues:

1. **CSS Over-blocking (`.video-ads { display: none !important; }`):**
   * *Problem:* `.video-ads` and `.ytp-ad-module` are containers inside YouTube's HTML5 player that house ad video elements and skip controls. Setting `display: none` turns the player area into a black void while the ad continues to play in the background, simultaneously making the skip button invisible and unclickable.
   * *Solution:* Never apply `display: none` to `.video-ads` or the video player module. Only target out-of-player cosmetic banners and promoted items.

2. **Player Desynchronization via `video.currentTime`:**
   * *Problem:* Setting `video.currentTime = video.duration - 0.05` or `99999` causes YouTube's media buffer to stall waiting for unbuffered ad chunks, leaving the player stuck on a black/frozen frame in an infinite loop.
   * *Solution:* Combine automatic skip-button clicks (`.ytp-ad-skip-button`), native `player.skipAd()` API invocation, and setting `video.playbackRate = 16.0` with `video.play()` so the ad frames fly by in under 200ms without buffering stalls.

3. **Telemetry & Heartbeat Blocking Stalls:**
   * *Problem:* Blocking YouTube's internal telemetry (`/api/stats/qoe`, `/api/stats/playback`) with empty `{}` responses triggers YouTube's anti-adblock detection, causing the server to intentionally pause the video stream for 5-10 seconds.
   * *Solution:* Block external Google ad networks (`googleads.g.doubleclick.net`, `pubads.g.doubleclick.net`, `adservice.google.com`), while letting internal streaming telemetry pass cleanly.

```
Incoming Request ──► [ External Ad Domain? ] ──► Yes ──► Drop & Return 200 {}
                            │ No
                            ▼
                     [ Normal YouTube Video Stream ]
                            │
                            ▼
              [ DOM Video Skipper Watcher (100ms) ]
                            │
             ┌──────────────┴──────────────┐
             │                             │
    [ Ad Playing? ]               [ Ad Finished? ]
             │                             │
    • Mute audio                  • Restore original playbackRate (1.0x)
    • Rate = 16.0x                • Restore unmuted state
    • Trigger video.play()        • Resume main video immediately
    • Click skip buttons
    • Call player.skipAd()
```

---

## 5. UI Layout & Navigation Architecture

### Clean Top Header (`src/components/TopHeader.tsx`)
The top header is deliberately minimal to maximize video viewing area:
* **Left:** Hardware-accelerated Back (`<`), Forward (`>`), and Reload (`↻`) buttons.
* **Center:** `YT_wr` brand logo (tap to navigate Home).
* **Right:** Live AdShield Protection counter badge and Dark/Light Neumorphic mode toggle.

### Bottom Dock with Integrated Search (`src/components/BottomDock.tsx`)
Controls are consolidated into a tactile floating dock at the bottom:
1. **Home (`home`):** Instant return to YouTube home feed.
2. **Search (`search`):** Opens the Neumorphic Search Modal to search YouTube or enter any custom URL.
3. **Zen Focus (`leaf`):** Instantly toggles distraction-free mode (hiding Shorts, comments, and recommendations).
4. **Desktop / Mobile Toggle (`desktop` / `phone-portrait`):** Switches User-Agent between desktop and mobile layouts.
5. **Extensions Manager (`extension-puzzle`):** Opens the extension store, live statistics, and custom script builder.

### Search Modal (`src/components/SearchModal.tsx`)
* Recessed Neumorphic text input with automatic focus.
* Quick category chips (Trending, Music, Gaming, Podcasts, Lofi Chill, Tech).
* Smart query parser: detects URLs vs search queries and routes accordingly.

---

## 6. How to Add New Extensions in the Future

### Method A: Adding Built-in Extensions (In Code)

1. **Create the extension file** in `src/core/extensions/`:
   ```typescript
   // src/core/extensions/youtubeMyFeature.ts
   import { ExtensionManifest } from '../../types/extension';

   export const youtubeMyFeature: ExtensionManifest = {
     id: 'youtube-my-feature',
     name: 'My New Feature',
     description: 'Does something useful on YouTube',
     version: '1.0.0',
     author: 'Your Name',
     icon: 'sparkles',
     category: 'enhancement',
     enabled: true,
     urlMatches: ['*://*.youtube.com/*'],
     runAt: 'document_end',
     injectedCSS: (settings) => `/* Custom CSS */`,
     injectedJSEnd: (settings) => `
       (function() {
         console.log('Feature active!');
       })();
     `,
   };
   ```

2. **Register the extension** in `src/core/extensions/defaultExtensions.ts`:
   ```typescript
   import { youtubeMyFeature } from './youtubeMyFeature';

   export const DEFAULT_EXTENSIONS: ExtensionManifest[] = [
     youtubeAdBlocker,
     youtubeDistractionFree,
     youtubeSponsorBlock,
     youtubeMyFeature, // <-- Add here
   ];
   ```

3. **Verify with commands**:
   ```bash
   npx tsc --noEmit
   npx expo lint
   ```

---

### Method B: Adding Custom Extensions (In App at Runtime)

1. Open the app and tap the **Extensions (`🧩`)** button in the bottom dock.
2. Tap **`+ Add Custom`**.
3. Fill in:
   - **Name:** e.g. "Auto High Quality"
   - **URL Match Pattern:** `*://*.youtube.com/*`
   - **Custom CSS:** (Optional CSS overrides)
   - **Custom JavaScript:** Code to execute in the web context with access to `window.__RN_EXTENSION_BRIDGE__`.
4. Tap **Save & Install**. The script is immediately compiled, persisted to `AsyncStorage`, and executed on matching pages.

---

## 7. Future Maintenance & Verification Checklist

Before releasing updates or adding new dependencies, run:
```bash
npx expo lint        # 0 errors, 0 warnings
npx tsc --noEmit     # TypeScript typecheck
npx expo-doctor      # 21/21 checks passed
```
