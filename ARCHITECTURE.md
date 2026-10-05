# YouTube_wr — Architecture & Technical Design Document

> **Document Version:** 1.0.0  
> **Status:** Active / Living Document  
> **Last Updated:** October 2026  
> **Maintainer:** YouTube_wr Engineering Team  

---

## 1. Executive Summary & Philosophy

`YouTube_wr` is a modern mobile YouTube client designed to combine the flexibility of YouTube's web platform with native mobile enhancements:
1. **Uncompromised Ad & Tracker Blocking:** Complete removal of video pre-roll/mid-roll ads, sponsored feed banners, search ads, and Google telemetry without requiring device rooting or private DNS.
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
| **Design Language** | **Neumorphism (Soft UI)** | Chosen over standard Material or Flat design to provide an elevated, modern tactile experience suited for audio/video media controls (e.g., sunken slider grooves, extruded knobs, tactile haptic toggles). |
| **Storage Engine** | **`@react-native-async-storage`** | Lightweight, key-value asynchronous storage without native database dependencies (SQLite/Realm), ideal for saving extension manifests, user configurations, theme preferences, and ad-blocking statistics. |
| **Haptics** | **`expo-haptics`** | Provides tactile feedback on button presses, slider adjustments, and switch toggles, enhancing the neumorphic physical feel. |

---

## 3. High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React Native Application Layer                   │
│                                                                        │
│   ┌───────────────────────┐  ┌─────────────────────────────────────┐  │
│   │   TopHeader (Nav/URL) │  │   BottomDock (Floating Controls)    │  │
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
│   │  • Intercept & drop Google Ad servers                          │   │
│   │  • Scrub player JSON (strip adPlacements & playerAds)          │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
│                                    │                                   │
│   ┌────────────────────────────────▼───────────────────────────────┐   │
│   │  DOM / Content Ready: Style & Script Runner                    │   │
│   │  • Inject combined CSS (<style id="__rn_extension_styles__">)  │   │
│   │  • Smart HTML5 Video Watcher (detects ads, mutes & skips)      │   │
│   │  • Web Audio API GainNode Booster (up to 300% volume)          │   │
│   │  • SPA Hook: Re-apply on 'yt-navigate-finish' & 'popstate'     │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Multi-Layer AdBlocker Technical Deep Dive

Standard web wrappers fail to block YouTube ads because YouTube delivers ads via encrypted chunks, single-page navigation, and HTML5 video element swapping. `YouTube_wr` implements a **5-layer defence system**:

```
Request ──► [ Layer 1: Network Interceptor ] ──► Allowed?
                   │ Drop if ad domain                 │ Yes
                   ▼                                   ▼
          Increment Stats                  [ Layer 2: Player Scrubbing ]
                                                       │ Remove adPlacements
                                                       ▼
                                           [ Layer 3: Cosmetic CSS ]
                                                       │ Hide banners/shelves
                                                       ▼
                                           [ Layer 4: HTML5 Video Skipper ]
                                                       │ Auto-skip & mute
                                                       ▼
                                           [ Layer 5: Bridge Dispatcher ]
```

### Layer 1: Pre-Content Network Interception
- **File:** `src/core/extensions/youtubeAdBlocker.ts`
- **Hook:** `injectedJavaScriptBeforeContentLoaded`
- **Mechanism:** Before any YouTube scripts execute, `window.fetch` and `XMLHttpRequest.prototype` are monkey-patched. Requests matching known Google Ad domains (`googleads.g.doubleclick.net`, `/pagead/`, `pubads.g.doubleclick.net`, `youtube.com/api/stats/ads`, `ptracking`) are immediately aborted and return mock empty responses `200 OK {}`.
- **Why:** Prevents ad video segments and telemetry from ever downloading, saving user bandwidth and battery.

### Layer 2: Player Config Scrubbing
- **Mechanism:** When YouTube requests `youtubei/v1/player`, the interceptor clones the response, parses the JSON payload, and deletes `adPlacements`, `playerAds`, and `adSlots` before returning the response to the YouTube player runtime.
- **Why:** This neutralizes the player before it can queue pre-roll or mid-roll ads.

### Layer 3: Cosmetic CSS Filtering
- **Mechanism:** Injected CSS with `!important` declarations targeting YouTube mobile (`m.youtube.com`) and desktop containers (`.ytp-ad-module`, `ytm-promoted-sparkles-web-renderer`, `ytd-display-ad-renderer`, `#player-ads`, etc.).
- **Why:** Eliminates visual clutter, sponsor banners, sponsored search results, and survey cards.

### Layer 4: Smart HTML5 Player Ad Skipper
- **Mechanism:** An active DOM watcher (running every 200ms and hooked to the `timeupdate` event of `<video>`) checks if `.ad-showing` or `.ytp-ad-player-overlay` is present on the player.
- **Action:** If an ad slips through:
  1. Instantly sets `video.muted = true` to silence audio.
  2. Sets `video.currentTime = video.duration || 99999` or elevates `playbackRate = 16.0`.
  3. Clicks any skip button element (`.ytp-ad-skip-button`, `.ytp-ad-skip-button-modern`, `.ytp-skip-ad-button`).
  4. Restores volume once the main video resumes.

### Layer 5: Bridge Telemetry & Stats Dispatch
- **Mechanism:** The injected script notifies native React Native via:
  ```javascript
  window.__RN_EXTENSION_BRIDGE__.send('youtube-adblocker', 'AD_BLOCKED', { source: 'network' | 'video_ad_skip' });
  ```
- **Why:** Updates the real-time HUD counter, tracking blocked ads, stopped trackers, and estimated time saved.

---

## 5. The Pluggable Extension Engine

### The Manifest Contract (`src/types/extension.ts`)

Every extension is declared using a strongly-typed `ExtensionManifest`:

```typescript
export interface ExtensionManifest {
  id: string;                         // Unique identifier (e.g., 'youtube-adblocker')
  name: string;                       // Human-readable title
  description: string;                // Short description of functionality
  version: string;                    // Semantic version
  author: string;                     // Extension author
  icon: string;                       // Ionicons icon key
  category: ExtensionCategory;        // 'adblock' | 'playback' | 'ui' | 'enhancement' | 'custom'
  enabled: boolean;                   // Toggle state
  urlMatches: string[];               // Wildcard patterns e.g. ["*://*.youtube.com/*"]
  runAt: 'document_start' | 'document_end' | 'both';
  injectedCSS?: string | ((settings: Record<string, any>) => string);
  injectedJSStart?: string | ((settings: Record<string, any>) => string);
  injectedJSEnd?: string | ((settings: Record<string, any>) => string);
  settings?: ExtensionSetting[];      // Sub-toggles, sliders, or select inputs
  userSettings?: Record<string, any>; // Persisted user settings
  isCustom?: boolean;                 // True if created by user inside the app
}
```

### The Two-Way Bridge Protocol
1. **Web to Native:**
   ```javascript
   window.__RN_EXTENSION_BRIDGE__.send(extensionId, actionType, payload);
   ```
   Routed through `react-native-webview`'s `onMessage` handler to `ExtensionEngine.parseBridgeMessage()` and dispatched to `ExtensionContext.handleBridgeMessage()`.

2. **Native to Web:**
   Native components send real-time commands (speed changes, volume boosts, loop states) without full page reloads via:
   ```typescript
   webViewRef.current?.injectJavaScript(`
     window.postMessage(JSON.stringify({ target: 'youtube-playback-boost', speed: 1.5, volumeBoost: 150 }), '*');
     true;
   `);
   ```

### SPA Route Change Resilience
Because YouTube is a Single-Page App (SPA), navigating to a new video does not trigger a full document reload. `ExtensionEngine` injects listeners for:
* `yt-navigate-finish`
* `popstate`
* `hashchange`

When these events fire, extension styles and watchers automatically re-bind to the new DOM.

---

## 6. Neumorphic (Soft UI) Design System

### The Optical Physics of Neumorphism
Neumorphism simulates physical objects extruded from or recessed into the background surface. This requires:
1. **Identical Surface Color:** The background and component surface share the exact same base color tone.
2. **Dual Diagonal Light Source:**
   - **Top-Left:** Light shadow simulating direct highlight (`#FFFFFF` in light mode, `#262A34` in dark mode).
   - **Bottom-Right:** Dark shadow simulating ambient occlusion (`#B8C4D4` in light mode, `#0E0F13` in dark mode).
3. **State Inversion:**
   - **Elevated (Default):** Highlights on top-left, shadows on bottom-right.
   - **Pressed / Inset (Active/Input):** Inverted border shading and darker recessed background.

### Implemented Neumorphic Primitives

| Component | Path | Key Capabilities |
| :--- | :--- | :--- |
| `NeumorphicBox` | `src/components/neumorphic/NeumorphicBox.tsx` | Base container supporting `depth` ('low', 'medium', 'high') and `state` ('elevated', 'pressed', 'inset'). |
| `NeumorphicButton` | `src/components/neumorphic/NeumorphicButton.tsx` | Pressable with spring depression, haptic tick, icon/label layout, and badge overlay. |
| `NeumorphicSwitch` | `src/components/neumorphic/NeumorphicSwitch.tsx` | Recessed pill track with convex sliding knob and spring animation. |
| `NeumorphicSlider` | `src/components/neumorphic/NeumorphicSlider.tsx` | Recessed groove with filled progress bar and extruded circular thumb for speeds and audio boost. |
| `NeumorphicInput` | `src/components/neumorphic/NeumorphicInput.tsx` | Sunken inset input with clear button, URL validation, and code editor support. |
| `NeumorphicBadge` | `src/components/neumorphic/NeumorphicBadge.tsx` | Compact pill for version tags, counters, and glowing status indicators. |

---

## 7. How to Add New Extensions in the Future

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
     settings: [
       {
         id: 'enableExtraOption',
         label: 'Extra Option',
         description: 'Toggles extra behavior',
         type: 'boolean',
         default: true,
       }
     ],
     userSettings: { enableExtraOption: true },
     injectedCSS: (settings) => `
       /* Custom CSS */
     `,
     injectedJSEnd: (settings) => `
       (function() {
         console.log('Feature running with setting:', ${settings.enableExtraOption});
       })();
     `,
   };
   ```

2. **Register the extension** in `src/core/extensions/defaultExtensions.ts`:
   ```typescript
   import { youtubeMyFeature } from './youtubeMyFeature';

   export const DEFAULT_EXTENSIONS: ExtensionManifest[] = [
     youtubeAdBlocker,
     youtubePlaybackEnhancer,
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

1. Open the app and tap the **Extensions (`🧩`)** button in the bottom dock or top header.
2. Tap **`+ Add Custom`**.
3. Fill in:
   - **Name:** e.g. "Auto High Quality"
   - **URL Match Pattern:** `*://*.youtube.com/*`
   - **Custom CSS:** (Optional CSS overrides)
   - **Custom JavaScript:** Code to execute in the web context with full access to `window.__RN_EXTENSION_BRIDGE__`.
4. Tap **Save & Install**. The script is immediately compiled, persisted to `AsyncStorage`, and executed on matching pages.

---

## 8. Maintenance Guidelines & Future Roadmap

When updating this codebase in the future, adhere to these principles:

1. **Expo Version Changes:** Always check `package.json` for the installed `expo` major version and consult versioned docs at `https://docs.expo.dev/versions/v<major>.0.0/`.
2. **Native Code Boundaries:** Never create or modify `ios/` or `android/` directories manually. Rely on Continuous Native Generation (CNG) and Expo config plugins in `app.json`.
3. **React 19 Hook Standards:** Avoid accessing `ref.current` during the render phase. Use `useMemo`, `useCallback`, or `useState` lazy initializers.
4. **Testing Pipeline:** Run `npx tsc --noEmit`, `npx expo lint`, and `npx expo-doctor` before tagging releases.

### Future Roadmap
- [ ] **SponsorBlock API Client:** Integrate the public SponsorBlock REST API to query timestamps for the active video and automatically skip sponsor segments.
- [ ] **Native Picture-in-Picture (PiP):** Expose native PiP triggers to allow video playback while using other apps.
- [ ] **Background Audio & Lockscreen Controls:** Integrate `expo-audio` / `react-native-track-player` to feed audio notifications into the Android/iOS media center.
- [ ] **Offline Cache & Downloader:** Integrate with download utilities to store media for offline playback.
