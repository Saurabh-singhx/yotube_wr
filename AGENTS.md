This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Mandatory Versioning on Every Change & Build (STRICT RULE)

On **every upcoming code change, bug fix, feature, refactor, or build** (even if it does NOT get pushed as a formal GitHub release):
1. **Always increment the version / build number**:
   - For changes and bug fixes: run `node scripts/bump-version.js patch` (e.g. `1.1.0` -> `1.1.1`, build incremented).
   - For new features: run `node scripts/bump-version.js minor`.
   - For internal builds / rebuilds: run `node scripts/bump-version.js build` (increments `versionCode` & `APP_BUILD`).
2. **Synchronize all 5 version sources atomically**:
   - `package.json` (`version`)
   - `package-lock.json` (`version` and root package)
   - `app.json` (`expo.version`, `expo.android.versionCode`)
   - `android/app/build.gradle` (`versionName`, `versionCode`)
   - `src/constants/version.ts` (`APP_VERSION`, `APP_BUILD`)
3. **No untracked builds**:
   - Never build an APK or conclude a task with stale or unchanged version numbers.
   - Every build MUST have a unique, incremented `versionCode` so Android package manager never collides with previous installations.
4. **Pre-Completion Checks**:
   - Run `npx expo lint`, `npx tsc --noEmit`, and `npm test` before concluding any task.

## WebApp Integrations & Multi-Platform Guidelines (CRITICAL RULES)

When integrating external webapps (Instagram, Reddit, X, Twitch, etc.) alongside YouTube:

1. **Always Use Mobile User-Agent by Default**:
   - Complex webapps serve heavily divergent layouts for mobile vs desktop.
   - **Never spoof or force Desktop User-Agent** on mobile viewports for sites like Instagram. Doing so causes severe layout breakages: squished 1-character vertical text, squeezed video dimensions, overlapping desktop sidebars, and multi-video stacking.
   - Always default to `MOBILE_USER_AGENT`. Only switch to `DESKTOP_USER_AGENT` if the user explicitly enables Desktop Mode in Settings.

2. **Prevent Cross-Domain Script & Style Pollution**:
   - YouTube-specific features (e.g. `zoomScript.ts`, SponsorBlock) must **strictly check the domain** (`youtube.com` / `youtu.be`) or be excluded before injection. Never let YouTube zoom toast pills ("Zoom: 107%", "Original") appear on external webapps.
   - Do NOT apply global CSS overrides (such as `padding-bottom`, `bottom: 74px`, or arbitrary margins) that modify native webapp navigation bars or layouts.

3. **Prevent Native App Dock Collisions with In-Page Navigation**:
   - Webapps like Instagram have their own bottom navigation bar at `bottom: 0`.
   - Never render a wide floating navigation bar centered over in-page navigation tabs.
   - On webapps with bottom navigation, default the native dock to a compact floating corner button (e.g., floating YouTube icon at `bottom: 62, right: 14`) so all webapp navigation buttons remain 100% visible, unobstructed, and clickable.

4. **Ultra-Smooth Full-Screen Reel & Vertical Video Scrolling**:
   - Use element-targeted scrolling with `scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })` targeting `article` elements rather than un-targeted `window.scrollBy`.
   - Combine with `scroll-snap-type: y mandatory`, `scroll-snap-stop: always`, `overscroll-behavior-y: contain`, `touch-action: pan-y`, and `contain: layout paint` for 60/120fps hardware acceleration.
   - Always include directional gesture filtering (ignore horizontal swipes) and a debounce lock (~400ms) to prevent jittery duplicate triggers during smooth scroll transitions.
   - Pausing of inactive/off-screen videos must be handled cleanly via `HTMLVideoElement.pause()` without modifying inline styles in loops.

5. **Reel & Video Quality Forcing on Mobile WebApps**:
   - Instagram web uses adaptive bitrate streaming that downscales video quality when device pixel ratio or network telemetry appear constrained.
   - Inject high-DPI cookies (`ig_pr=3`, `ig_vw=1080`, `ig_vh=1920`) at `document_start`, spoof `navigator.connection` (`effectiveType: '4g'`, `downlink: 50`), and ensure `window.devicePixelRatio >= 3` so the player automatically selects the 1080p / highest bitrate video manifests.

6. **Isolated Multi-Touch Screen Adjust Without Layout Collisions**:
   - Two-finger touch gestures (`e.touches.length === 2`) must register with `{ passive: false }` and call `e.preventDefault()` to prevent Android WebView from pinch-zooming the DOM viewport (which breaks layout responsiveness, text wrapping, and button positioning).
   - Single-finger touches (`e.touches.length === 1`) must remain completely untouched so vertical reel scrolling and tap-to-pause are 100% fluid.
   - Video scaling must strictly target the active `<video>` element's `transform: scale(...)` and automatically reset to 1.0x when scrolling to the next or previous reel.

7. **Safe DOM Targeting for Bottom Navigation Removal (NEVER Target Ancestors or Use Broad CSS `:has()`):**
   - In modern single page apps (Instagram/React), root mount wrappers (`#mount_0_0_...`, app frames) contain all navigation icons.
   - **NEVER** write broad CSS selectors like `div:has(...)` with descendant selectors or `div[style*="position: fixed"][style*="bottom: 0"]`. Doing so matches root app wrappers and hides the entire application (causing a blank white screen).
   - Bottom bar removal must strictly target the specific small navigation container (`height <= 85px` and `top >= window.innerHeight - 85`) and NEVER traverse up to hide parent/ancestor elements.

8. **Never Intercept Network `fetch()` or Monkey-Patch Streams on Complex SPAs:**
   - Modern webapps use HTTP gzip/brotli compression and custom streaming transports (Relay, GraphQL).
   - Replacing `Response` objects in `window.fetch` breaks stream decoding (`ERR_CONTENT_DECODING_FAILED`), crashing client-side React hydration before anything can render (white screen).
   - Ad filtering must ALWAYS be performed at the DOM level using debounced text/CTA analysis on `<article>` elements.

