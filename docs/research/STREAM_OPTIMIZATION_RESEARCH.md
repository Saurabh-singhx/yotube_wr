# Media Stream Optimization & Telemetry Sanitization Architecture Report

## 1. Executive Summary & Problem Statement

Users of web media client applications frequently encounter three prominent and disruptive issues with mobile video playback and promotional stream transitions:
1. **Transition Overlay Flashing / Lingering**: Promotional stream badges or countdown overlays momentarily flash on screen or remain visible before dismissing.
2. **Flickering & Frame Stuttering**: When accelerating sequential promotional breaks (such as back-to-back pre-roll segments), the video player can flicker violently. Video frames jump back and forth, audio pops or un-mutes momentarily, and the player state machine oscillates rapidly.
3. **Delayed Stream Acceleration**: Transition acceleration sometimes lags by 1 to 3 seconds before executing, forcing an unintended delay.

This document compiles technical research, root-cause analysis, lessons learned from past implementations, and the production-grade architectural solution implemented in **Vidwr**.

---

## 2. Industry Research & Technical References

During development, we analyzed technical documentation and architectures of leading open-source content filtering and userscript projects:

### A. uBlock Origin & uAssets (`gorhill/uBlock`, `uBlockOrigin/uAssets`)
* **Key Insight**: uBlock Origin utilizes specialized **scriptlets** (`json-prune`, `set-constant`, `trusted-prune-outbound-object`) rather than synthetic clicks.
* **The Mechanism**: Web media clients receive an initial configuration object (`window.ytInitialPlayerResponse`) and subsequent API payloads via `/youtubei/v1/player`. Within these objects, ad schedules are embedded under specific keys:
  - `adPlacements`
  - `playerAds`
  - `adSlots`
  - `adBreakHeartbeatParams`
* **Crucial Rule**: In uAssets, the rule is:
  ```text
  youtube.com##+js(set-constant, ytInitialPlayerResponse.adPlacements, undefined)
  youtube.com##+js(json-prune, playerResponse.adPlacements playerResponse.playerAds adPlacements playerAds)
  ```
  The property must be deleted or set to `undefined`. If absent, the player initializes unencumbered by ad playback schedules.

### B. FadBlock & FadBlock Origin (`0x48piraj/fadblock`, `fadblock-origin`)
* **Key Insight**: FadBlock acted as an accelerator that sped up promotional video segments (10x-16x) and adjusted `currentTime` to `duration`.
* **Why It Was Archived**:
  - Relied purely on DOM polling for `.ad-showing` and skip buttons.
  - Changes in player state machines caused fast-forwarding to trigger video buffer desyncs, black screens, and flickering when transitioning between sequential clips. Pure DOM speed-up is brittle without data-level schema sanitization.

### C. RemoveAdblockThing & GreasyFork UserScripts
* **Key Insight**: Monitored the player element for classes like `ad-showing` and programmatically clicked `.ytp-ad-skip-button`.
* **Failure Modes**:
  - Unskippable bumper ads (6-15 seconds) do not render a clickable skip button.
  - Programmatic click throttles caused user scripts to either wait or trigger anti-adblock enforcement dialogs.

### D. XTUFE / YouTube-Premium-XTUFE
* **Key Insight**: Overrides `ytInitialPlayerResponse` and patches `Response.prototype.json` to strip ad properties from endpoints before the player can process them.
* **Compatibility Consideration**: Crucially, it leaves network transport streams intact and only intercepts deserialized JSON objects, avoiding content decoding crashes.

---

## 3. Prior Architectural Attempts & Failure Analysis

Analyzing why earlier approaches failed provides crucial design guidance:

### Attempt 1: Network Monkey-Patching `window.fetch` and `XMLHttpRequest`
* **What was tried**: The script replaced `window.fetch` and `XMLHttpRequest.prototype.send`, returning dummy `new Response(JSON.stringify({}))` for ad URLs and rebuilding `new Response(JSON.stringify(cleanData))` for `/youtubei/v1/player`.
* **Why it failed**:
  - Replacing `Response` objects in `window.fetch` breaks native stream decompression (gzip/brotli) on modern Single Page Applications, leading to `ERR_CONTENT_DECODING_FAILED` and total player crash.
  - Missing analytics pings caused server-side playback stalls and black screen timeouts.

### Attempt 2: Schema Validation Auto-Pause Trap
* **What was tried**: Early pruning scripts replaced `data.adPlacements = []`.
* **Why it failed**:
  - Player schema validation expects `adPlacements` to either be **completely absent (`undefined`)** or contain a populated array of valid `adPlacementRenderer` objects.
  - When `adPlacements` was set to an empty array `[]`, player code attempted to index `data.adPlacements[0]`, encountered `undefined`, threw an uncaught internal exception, and halted playback (the auto-pause / video freeze bug).

---

## 4. Production-Grade Solution: The 3-Tier Architecture in Vidwr

Vidwr implements a robust 3-Tier engine in `src/core/extensions/contentShield.ts` (Content Shield Pro):

```
┌───────────────────────────────────────────────────────────────┐
│                 TIER 1: Data-Level Neutralization             │
│  - Intercept ytInitialPlayerResponse at document_start         │
│  - Chain Response.prototype.json (zero stream modification)   │
│  - Delete keys (adPlacements, adSlots, etc.) via 'delete'     │
└───────────────────────────────┬───────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────┐
│                 TIER 2: Instant Cosmetic Shield               │
│  - Injected CSS hides promotional banners, sponsored cards    │
│  - Suppresses overlay badges & mealbars instantly             │
└───────────────────────────────┬───────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────┐
│                 TIER 3: Velocity Presentation Engine          │
│  - If an ad stream enters player: mute + 16x acceleration     │
│  - 150ms Exit Debounce Lock prevents flicker across clips     │
│  - Seamlessly restores 1.0x playback rate & user volume       │
└───────────────────────────────────────────────────────────────┘
```

1. **Velocity Seeking (Zero Frame Oscillation)**:
   Mutes audio, sets `video.playbackRate = 16.0`, and advances `video.currentTime = video.duration` safely once per promotional clip.
2. **Ad-Exit Debounce Lock (150ms)**:
   When promotional playback ends, a 150ms timer ensures sequential ads do not cause audio pops or flickering before main video playback is confirmed.
3. **No Blind Timeouts**:
   Eliminated arbitrary `setTimeout` nudges. Genuine decoder stalls are handled cleanly via native stall watchdogs.

---

## 5. Video Startup Latency Investigation & Optimizations

When users tap a video thumbnail, compounding bottlenecks previously introduced a 1–3 second delay before playback started:

1. **300ms Mobile Tap Delay**:
   - Applied `touch-action: manipulation !important` to all thumbnail cards and interactive elements. Taps now register with **0ms lag**.
2. **Mobile Web Cued/Autoplay Throttle**:
   - Added the **Instant Video Playback Accelerator** in `ExtensionEngine.ts`. The moment navigation reaches `/watch` (at 50ms, 150ms, 350ms, 650ms), it automatically dismisses cued thumbnail overlays and starts playback cleanly.
3. **DNS & TLS Handshake Latency**:
   - Injected `<link rel="preconnect">` and `<link rel="dns-prefetch">` at document start, pre-warming TLS sockets before the user navigates.
4. **Adaptive Quality Grace Period**:
   - `youtubeAutoHD` enforces high resolution after playback begins (`!video.paused && video.currentTime >= 0.8`), ensuring smooth startup without aborting the initial buffer.
5. **Focused JSON Pruning**:
   - Pruning is strictly confined to root properties and `playerResponse`, executing in sub-millisecond time.
