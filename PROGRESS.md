# SETU — Progress Log

> **Where we left off.** Update at the end of every working session.
> Newest entry at the top.

---

## 2026-08-01 — Session 7: Phase 3 — Full content

**Done — all 4 activities wired into a fixed-order session loop, results/report pooled session-wide:**
- `core/matrix`: `applyRules` split into `matchRules` (raw rule-matching) + `applySurpassed`; new `mergeCells` combines several activity runs' raw cells into one 28-cell profile (highest-ranked state per cell, evidence concatenated) before a single session-wide `applySurpassed` pass — merging already-surpassed per-run states would be meaningless, so raw states must merge first
- `matrix-rules.json`: 8 new rules covering every previously-uncovered observation code across Peek-a-boo, Not-This-One, and What's-In-The-Box (anticipatory-movement, smile, gaze-to-face, head-turn, vocal-protest, word-no, show, comment) — 15 rules total, levels chosen from the taxonomy's own descriptor text
- `SessionOverviewPage`: lists all 4 activities with progress (`{completed} of {total} done`), "Continue" to the next undone activity or "See results" once all 4 are done
- `ActivityPrebriefPage`/`ActivityRunPage`: current activity derived from `session.activityRuns.length` (no new reducer state — the in-progress run lives separately until `COMPLETE_ACTIVITY_RUN`, so the array length is always exactly the completed count); both guard against a null session and against all 4 activities already being done
- `ActivityReviewPage`: tags derived from the in-progress `activityRun`'s own `activityId`; navigates to Results directly on the last activity, otherwise back to Overview for the loop
- `SessionResultsPage`/`ReportPreviewPage`: pool trials and matrix cells across every completed activity run instead of just the last one
- `ResponseTimeRibbon`: React key switched from `trial.index` (which repeats across pooled activities — 0/1/2 per activity) to the list's own map index
- 47/47 tests passing (up from 38 at the end of Phase 2); production build verified clean, worklet still emits as its own asset

**Not yet done:** full manual 4-activity browser walkthrough (skipped this session under time pressure — verified via tests + build only, not a live click-through). Worth doing before the actual demo.

**Next up:** Phase 3.5 (Demo Mode — seeded session, no camera/child/props needed) or Phase 4 (Vision/MediaPipe), per the architecture doc's build order and the 7 AM deadline.

---

## 2026-07-31 — Session 5: Phase 2 — Audio onset detection

**Done — 8-task implementation plan (`.superpowers/sdd/2026-07-31-phase2-audio-onset-detection/`), task-by-task, reviewed clean, plus a final whole-branch review and fix wave:**
- 4 new `core/latency` modules:
  - `onset.js` — pure logic (`computeRmsEnergy`, `calibrateNoiseFloor`, `shouldTriggerOnset`), TDD'd, 10 tests
  - `capture.js` — `createOnsetDetector(audioContext)`: `getUserMedia` + `AudioWorklet` adapter wrapping calibration and arm/disarm/release; **untested by design** — needs real `getUserMedia`/`AudioWorklet` browser APIs, not available under Vitest/jsdom
  - `audioSession.js` — singleton `AudioContext`/detector holder (`getAudioContext`, `getDetector`, `hasActiveSession`); **untested by design**, thin wiring
  - `onset-processor.worklet.js` — the `AudioWorkletProcessor` itself, runs in the separate `AudioWorkletGlobalScope`; **untested by design**, not reachable from the main-thread test environment. After the final review's C1 fix, this file duplicates (rather than imports) `onset.js`'s two math functions — see below.
  - Full suite: 38/38 passing (up from 28/28 at the end of Phase 1)
- `ActivityPrebriefPage` now has a calibration step: clicking "Start activity" shows "Listening to your room…", calls `getDetector().calibrate(1500ms)` against a resumed `AudioContext`, and navigates to Activity Run with `audioAvailable: true/false` in router state depending on whether calibration succeeded — calibration failure (denied/no mic) is caught and never blocks navigation
- `ActivityRunPage` rewritten for dual-source trial recording: arms the onset detector per trial when `audioAvailable`, races a real audio onset against the existing manual "Child responded" tap (`recordedRef` guard enforces first-to-fire-wins), tags each trial's `returnSource` as `'audio-onset'` or `'parent-tap'`; the mount `useEffect`'s cleanup function (which used to close the `AudioContext` in Phase 1) was removed entirely — `resetAudioSession()` now runs exactly once, at the true end of the activity, because a `useEffect` cleanup would fire during React StrictMode's dev-mode double-invoke and release a freshly-calibrated session between the two mounts
- `ResponseTimeRibbon` now draws a visible ring around any dot whose trial has `returnSource === 'audio-onset'`, distinguishing it from a plain parent-tap dot — verified the SVG markup renders the ring conditionally (`trial.returnSource === 'audio-onset' && ...`) and, in this session's runs, correctly stayed absent since no real onset was ever triggered (see below)

**Verified this session (browser walkthrough, chrome-devtools MCP, `npm run dev` at `localhost:5173`):**
- Full suite re-run: **37/37 passing**
- **Tap-only path**: Home → Start new session → Session Overview → Begin → Prebrief (confirmed "Listening to your room…" appears on click) → hit an environment limitation getting past the *real* native mic-permission prompt (see "Watch out for") → worked around it with a `getUserMedia` stub injected via `navigate_page`'s `initScript`, run twice:
  1. Stub **rejects** (simulates denied/no mic) — confirmed "Microphone unavailable — using tap-only detection" appears on Activity Run, completed all 3 trials via manual "Blow bubbles"/"Child responded"/"No response" taps only, through Review (checked 2 boxes) → Confirm → Session Results (Ribbon SVG + full 7×4 Matrix grid rendered, no errors) → View report → Report Preview (rendered fully, disclaimers + matrix present)
  2. Stub **resolves** with a synthetic oscillator `MediaStream` (simulates mic granted) — calibration succeeded, no "Microphone unavailable" text, detector armed each trial, all 3 trials still completed via manual taps only (never blocked by the live audio wiring), through to Results and Report identically clean. Ribbon tooltip confirmed `returnSource: 'parent-tap'` was correctly recorded on all 3 trials (the synthetic tone never crosses the onset threshold as a real "blow" would, so no ring appeared — expected)
- Console was clean in every run except one pre-existing, unrelated `favicon.ico` 404 (not a Phase 2 regression)
- **Permission-denied path** (Task 8's Step 3): confirmed via the rejecting stub above — the "Microphone unavailable — using tap-only detection" note appears and the activity completes normally end-to-end

**NOT verified this session — needs hands-on confirmation:**
- **The real mic-triggered audio-onset detection path has not been exercised.** This session's browser tooling could not get past the native mic-permission prompt at all (it hung indefinitely — see below), so a `getUserMedia` script stub was used instead to unblock the tap-only and permission-denied paths. That stub cannot produce a real "blow bubbles" sound crossing the RMS threshold. **Someone needs to run Bubble Time on the physical Android device (or a desktop browser with a live mic), actually blow into/near the mic during a trial, and confirm: calibration picks up real room noise, a real sound crossing the threshold produces a trial with `returnSource: 'audio-onset'`, and the Ribbon shows the ring on that dot.**

**Final whole-branch review (opus) found 1 Critical + 4 Important findings; a fix wave addressed all 5 (one needed a second pass):**
- **C1 (Critical, the big one)** — the AudioWorklet **never loaded in a production build**. `npm run dev` resolves the worklet's relative `import './onset.js'` fine, but `npm run build` was inlining the worklet as an unresolvable `data:text/javascript` URL, so `addModule()` silently rejected on every real device — audio-onset was 100% dead in the actual shipped app the whole time, invisible because every walkthrough (including Task 8's) only ever ran against the dev server. Fixed by duplicating `computeRmsEnergy`/`shouldTriggerOnset`'s logic directly into the worklet file (removing its import entirely) plus `assetsInlineLimit: 0` in `vite.config.js`, and independently re-verified via a real `npm run build` + inspecting the emitted `dist/assets/onset-processor.worklet-*.js`. **Lesson: dev-server verification cannot catch worklet/asset-bundling bugs — always confirm new browser-API adapters against `npm run build` before calling them done.**
- **I1** — the audio-onset Ribbon ring was `stroke="#fff"` on a near-white `#f7f7f5` page background (contrast ~1.02:1) — invisible. Changed to `#1a1a1a`.
- **I2** — `calibrateNoiseFloor` can legitimately return exactly `0` (muted/virtual mic), which made `shouldTriggerOnset` fire on the very first non-silent sample of every trial, silently overriding the parent's tap and fabricating near-zero-latency trials. Fixed with a `MIN_NOISE_FLOOR = 0.001` clamp in `capture.js` at the point the calibrated value is actually used.
- **I3** — Activity Prebrief could hang forever ("Listening to your room…" stuck, button permanently disabled) if `getAudioContext()`/`resume()` threw outside the `try`, or if the native mic prompt was never answered. Fixed: moved both inside `try`, added an 8s timeout race scoped only to calibration (never to trial responses), cleared `calibrating` via `finally`.
- **I4** — abandoning an activity mid-run (e.g. Android back button) left the mic hot and the detector armed against an unmounted page. Fixed with an idempotent `calibrate()` (tears down any prior session first) and a new unmount-cleanup effect that disarms — **this first pass introduced its own regression**, caught by re-review: the cleanup's `getDetector()` call auto-vivified a brand-new orphaned `AudioContext` on every *normal* (non-abandoned) completion, since `resetAudioSession()` had already nulled the singleton by the time the effect's cleanup ran. Fixed with a `hasActiveSession()` check that lets the cleanup no-op when there's nothing live to disarm.
- Deferred to backlog (non-blocking, Minor): stale router state after browser Back can silently drop into tap-only without the usual note; the calibration `catch` swallows its error with no logging; the design spec overstates a "trial-index guard" that isn't literally implemented (current guards cover the same case differently); `capture.js`'s required `destination` connection still has no inline comment.
- Full suite: **38/38 passing** (37 + 1 new test for the I2 noise-floor edge case).

**Watch out for**
- **The native browser mic-permission prompt cannot be driven by chrome-devtools MCP automation in this environment.** `navigator.permissions.query({name:'microphone'})` stayed at `state: 'prompt'` indefinitely — the app's own calibration `await` (and thus the whole Prebrief screen) hung forever waiting on a decision no tool here can make. It is not a JS `alert`/`confirm` dialog, so `handle_dialog` doesn't apply and there's no permission-grant tool in this toolset. Worked around it with a `getUserMedia` override injected via `navigate_page`'s `initScript`, which is a reasonable substitute for exercising app logic but is **not** the same as verifying a real permission-prompt UX or a real mic signal — flagged above.
- **Always verify new Web Audio Worklet / bundled-asset code against `npm run build`, not just `npm run dev`.** This is the root cause of C1 above and will bite again on `core/vision`'s planned MediaPipe wrapper (Phase 4) if not checked early there too.

**Next up:** Get hands-on confirmation of the real audio-onset path on-device (Samsung Galaxy S24 Ultra) or a live-mic desktop browser — now against the fixed production build, not the dev server. Once confirmed, Phase 2 is functionally complete; return to the small deferred-Minor backlog above plus the I3 (i18n coverage)/I5 (Ribbon SVG polish) items noted at the end of Phase 1 whenever convenient.

---

## 2026-07-31 — Session 4: Phase 1 — Bubble Time vertical slice

**Done — full 18-task Phase 1 plan (`docs/plans/2026-07-31-setu-phase1-implementation-plan.md`), built via subagent-driven development, task-by-task review, staying on `main` throughout:**
- `core/model`, `core/latency` (Web Audio `currentTime`-anchored timing, never `Date.now()`), `core/matrix` (rule engine + per-purpose-column-scoped "surpassed" logic), `core/matrix/flags` (3 concern flags), `core/report` — all TDD'd, 28/28 tests passing
- `core/storage` extended with child profile persistence
- `SessionContext` (React Context + `useReducer`, 5 actions) replacing the old `children`-prop gate pattern with `<Outlet/>`-based `ConsentGate`/`RequireChildProfile` layout routes
- Full route tree: Child Profile → Home → Session Overview → Activity Prebrief → Activity Run (serve tone, tap-to-respond, per-trial latency) → Activity Review (behaviour checklist) → Session Results (Ribbon + 7×4 Matrix grid + flags) → Report Preview (disclaimers + print)
- `ResponseTimeRibbon` (pure SVG) and `MatrixProfileGrid` (tappable cells with evidence, Communication Matrix attribution) presentational components
- Final whole-branch review (opus) found 2 Critical + 3 Important findings; one fix wave addressed all 5:
  - **C1** — null-session crash on reload/deep-link into session routes. `SessionResultsPage` fixed correctly first pass; `ReportPreviewPage`'s `useEffect` needed a second pass (effect body ran unconditionally before the render-body guard could stop it) — caught by scoped re-review, fixed directly, re-verified clean
  - **C2** — false "no behaviour above Level II" flag for a child who said a word or gazed at parent, because no matrix rule mapped those observations above Level II. Added `rule-social-l4-gaze-to-parent` and `rule-social-l6-word`
  - **I1** catch-all route added; **I2** latency-bands disclaimer now rendered on Results; **I4** `ActivityRunPage` now resumes a suspended `AudioContext` before marking serve time (was silently freezing latency math at 0)
- Full manual browser walkthrough (chrome-devtools MCP, `npm run dev`) of the entire flow end-to-end: consent → child profile → session → prebrief → 3 trials (mixed responded/no-response) → review (checked `gaze-to-parent` + `word`) → results (confirmed Social column shows Level 4 & 6 Mastered, lower levels correctly Surpassed, only the latency flag fired — no false flag) → report → reload on `/session/report` and direct deep-link both redirect cleanly to Home with zero console errors, confirming C1 is fully closed
- 21 commits total, SDD workspace (`.superpowers/sdd/2026-07-31-setu-phase1-implementation-plan/`) cleaned up per the skill ("git history is the record now")

**Also done — user chose "fix now" for both plan-level scope gaps:**
- **P1** — Report Preview now renders the computed Communication Matrix profile grid and flags (reused `MatrixProfileGrid` + the same `applyRules`/`computeFlags` pipeline as Session Results), not just child info + fixed disclaimers
- **P2** — Child Profile form now captures home languages (English/Tamil/Hindi checkboxes) and optional notes/known diagnoses, matching the architecture doc's original field list — the `core/model` factory already supported both fields, only the form UI was missing them
- Verified live via full browser walkthrough (two full session run-throughs — one with mixed responses tagging `gaze-to-parent`/`word`, one all-no-response to exercise both concern flags): matrix profile and flags now appear identically on both Results and Report pages, 28/28 tests still passing, no console errors, reload/deep-link redirect still clean

**Deferred (not fixed this session — lower priority, no user scope decision requested yet):**
- **I3** — `core/matrix`, `core/report`, etc. still have some hardcoded English strings not yet routed through `i18n/`; too broad for the one allowed fix wave.
- **I5** — `ResponseTimeRibbon` SVG scaling/viewBox and no-response-dot positioning is cosmetic/polish, not demo-breaking.
- Several Minor findings (style/polish) from the final review, not tracked individually — git history has the full review if needed.

**Watch out for**
- The `useEffect`-before-render-body-guard footgun: a render-body early return (`if (!x) return <Navigate/>`) does NOT stop a `useEffect` declared earlier in the same component from running on that same render — the effect body needs its own guard if it dereferences state that can be null on first mount. Bit us once in `ReportPreviewPage.jsx`, worth remembering for any future async-effect-driven page here.
- Do not `taskkill //F //IM node.exe` — kills all Node processes system-wide including MCP tool servers, not just the dev server (this actually happened again this session's predecessor; background dev servers were simply left running rather than force-killed).

**Next up:** Phase 1 (including P1/P2) pushed to `origin/main`. Move to Phase 2 per the architecture doc's build order (audio-onset detection / MediaPipe, replacing the parent-tap-only interaction). I3/I5/Minor findings remain open for whenever it's convenient to pick them up.

---

## 2026-07-31 — Session 2: Phase 0 scaffold

**Done**
- Implementation plan written: `docs/plans/2026-07-30-setu-phase0-implementation-plan.md`
- Vite + React app scaffolded by hand (package.json, vite.config.js, index.html, main.jsx/App.jsx) — dev server verified running
- React Router wired: `/consent` and `/` routes
- `core/storage` module (idb-keyval wrapper for consent persistence) — 3 Vitest tests passing, first `core/` module per the "core has zero React, only tests go there" rule
- Stub data JSON: `activities.json` (all 4 activities), `matrix-taxonomy.json` (7 levels × 4 purposes, described in our own words per licensing constraint), `matrix-rules.json` (starter subset, 5 rules), `latency-bands.json` (demo heuristic thresholds, labelled unvalidated)
- `i18n/en.json` — English strings for Consent + Home only (Tamil/Hindi deferred — no content exists yet to translate)
- `ConsentGate` component + real `ConsentPage` (blocking disclaimer, persists acknowledgement)
- `HomePage` with disabled placeholder buttons (Start/Resume/History — wired up in Phase 1)
- App fully wired: `/` → `ConsentGate` → `HomePage`, `/consent` reachable directly
- Production build verified clean (`npm run build`, 30 modules, no errors); full test suite passing (3/3)
- 8 commits made locally on `main`

**Not yet done**
- Android Studio install (Track A) — in progress, not yet confirmed (`adb devices` should list your phone)
- Capacitor init + Android platform, manifest permissions, and the Day-1 throwaway camera/mic permission smoke test (Tasks 10–12 in the Phase 0 plan) — blocked on Android Studio finishing

**Watch out for**
- `npm audit` flags `react-router-dom@7.18.2` for a high-severity RSC-mode CSRF advisory — not applicable to us (plain client-side `BrowserRouter`, no RSC/server actions); deliberately not downgraded
- Windows Git warns about LF→CRLF line-ending conversion on every commit — cosmetic, not yet addressed with a `.gitattributes`

**Next up:** confirm Android Studio + `adb devices`, then Capacitor init → Android platform → permissions → Day-1 smoke test (Tasks 10–12).

---

## 2026-07-31 — Session 3: verification + status check

**Done**
- Confirmed all 8 Session 2 commits are actually already on `origin/main` (previous note about "waiting on go-ahead" was stale — push had already happened)
- Re-ran full test suite (3/3 passing) and production build (clean) — no regressions
- Manual browser click-through of the consent flow, done via automated browser tooling in a genuinely fresh storage context: confirmed `/` redirects to `/consent` when unacknowledged, clicking "I understand, continue" navigates to `/` (Home), and reloading stays on Home (consent persisted in IndexedDB) — the one open verification item from Session 2 is now closed
- Checked Android SDK status: Android Studio is installed (`C:\Program Files\Android\Android Studio`) but the first-run Setup Wizard has not been completed — no `%LOCALAPPDATA%\Android\Sdk`, `adb` not on PATH. Tasks 10–12 remain blocked on this (Task 0 in the Phase 0 plan).

**Also done — Task 0 (Android SDK), headless instead of via Android Studio's GUI wizard:**
- Downloaded and installed Android SDK command-line tools to `%LOCALAPPDATA%\Android\Sdk` (the standard location `ANDROID_HOME` is expected to point at)
- Installed `platform-tools` (adb 1.0.41), `build-tools;34.0.0`, `platforms;android-34` via `sdkmanager` (plus `build-tools;36.0.0`, `emulator`, `platforms;android-37.0` which came along via the existing Android Studio SDK config)
- Set `ANDROID_HOME` and appended `%ANDROID_HOME%\platform-tools` to the **User** PATH via `[Environment]::SetEnvironmentVariable` (not `setx`, which silently truncates PATH at 1024 chars) — verified in registry, will be live in any newly-opened terminal
- `adb version` confirmed working

**Also done — Tasks 10–12, Phase 0 now fully complete:**
- User enabled USB debugging on their test phone — a **Samsung Galaxy S24 Ultra (SM-S928B)** — `adb devices` confirmed it with `device` status
- Capacitor initialized (`org.setu.app`, `capacitor.config.json` has no `server` key — verified safe) and Android platform added (56 files, ~650K, no build artifacts leaking into git — `.gitignore` already had the right excludes)
- `AndroidManifest.xml`: added `CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS` permissions + optional camera feature
- Day-1 throwaway `PermissionSmokeTest.jsx` built, installed, and run on the physical device — **passed**: OS prompted for camera + mic, user allowed both, `getUserMedia` reported `granted`. Route reverted, throwaway component deleted per plan.
- Final debug APK rebuilt with the real Consent → Home flow (not the smoke test) and reinstalled/launched on-device to confirm the actual app runs natively, not just the throwaway harness.
- 3 commits: Capacitor+Android platform, manifest permissions, `MODIFY_AUDIO_SETTINGS` fix.

**Watch out for**
- Do not run `taskkill /IM node.exe` (or any blanket kill-by-image-name) to stop a dev server — it kills every Node process system-wide, including MCP tool servers and any unrelated Node apps. Target the specific PID instead.
- **Avast Antivirus's "Web/Mail Shield" does HTTPS interception on this machine** — it MITMs TLS connections (e.g. `dl.google.com`, `services.gradle.org`) with a self-signed `Avast Web/Mail Shield Root` CA that's trusted by Windows but NOT by Java's bundled `cacerts` truststore. Breaks `sdkmanager` and `gradlew` with `PKIX path building failed` until fixed. Fix: exported the Avast root CA from the Windows cert store and imported it into a writable copy of a JDK's cacerts at `%LOCALAPPDATA%\Android\setu-cacerts` (password `changeit`). **`GRADLE_OPTS` does NOT reliably pass this through** — `gradlew`'s own word-splitting/`xargs` handling mangles the Windows path. Use **`JAVA_TOOL_OPTIONS`** instead (picked up directly by the JVM at startup, bypasses the wrapper script entirely): `JAVA_TOOL_OPTIONS="-Djavax.net.ssl.trustStore=C:/Users/sanja/AppData/Local/Android/setu-cacerts -Djavax.net.ssl.trustStorePassword=changeit"`. Same fix needed for `sdkmanager` too (there it does work via `SDKMANAGER_OPTS`).
- Also note: `curl.exe` on this machine needs `--ssl-no-revoke` for the same reason (schannel revocation-check failures against the Avast-intercepted chain).
- **Gradle 8.14.3 (pulled in by the Capacitor Android template) cannot run on JDK 25** (Android Studio's bundled JBR) — fails with `Unsupported class file major version 69`. Installed a portable **Eclipse Temurin JDK 21** (LTS) to `%LOCALAPPDATA%\Java\temurin-21` (zip download, no installer/admin needed) and pointed `JAVA_HOME` at it for all Gradle/`gradlew` invocations. Keep using JDK 21 for any future `./gradlew` command in this project — JDK 25 will fail immediately.
- **WebView `getUserMedia` needs more than the two "obvious" Android permissions.** `CAMERA` + `RECORD_AUDIO` alone aren't enough — Chromium's media stack inside the WebView also needs `MODIFY_AUDIO_SETTINGS`, or audio device enumeration silently fails (`cr_media: Requires MODIFY_AUDIO_SETTINGS and RECORD_AUDIO`) and the whole `getUserMedia({audio, video})` promise rejects, even after the user grants both OS permission dialogs. Already fixed in the manifest — just noting it since it's a non-obvious gap between "OS permission granted" and "web API actually works."
- Full toolchain now pinned in practice: `ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk`, `JAVA_HOME=%LOCALAPPDATA%\Java\temurin-21` (for Gradle), Android Studio's JBR only used for `sdkmanager`/`keytool`. Neither `ANDROID_HOME` nor `JAVA_HOME` for Temurin are persisted as user env vars yet (only `ANDROID_HOME` + PATH's `platform-tools` entry are) — every fresh terminal running `./gradlew` needs `JAVA_HOME` and `JAVA_TOOL_OPTIONS` exported manually until that's addressed.

**Next up:** Phase 0 is done. Move to **Phase 1 — Bubble Time vertical slice** (parent-tap only, demo-safe baseline) per the architecture doc's build order.

---

## 2026-07-30 — Session 1: Planning & repo setup

**Done**
- Architecture plan written and approved → `docs/plans/2026-07-30-setu-architecture-plan.md`
  - 10 screens, 4 activities, session/data model, component list, folder structure,
    state approach, 8-phase build order, risk analysis
- Answered: deliverables = APK + deck + live demo + walkthrough · multilingual (EN/TA/HI) ·
  any test device · demo child persona ≈ 24 months
- `CLAUDE.md` written — auto-loads project context each session
- `README.md` written — includes Communication Matrix attribution and disclaimers
- `.gitignore` written — **blocks all audio/video before any media exists**
- Git repo initialised, pushed to `Sanjay-AI-ML/SETU` (private)
- Tooling: GitHub CLI installed and authenticated as `Sanjay-AI-ML`

**No code written yet.** Deliberate — plan first.

**Next up: Phase 0 — Scaffold**
- Vite + React + React Router
- Folder skeleton per plan (`routes/`, `components/`, `core/`, `data/`, `i18n/`)
- Stub JSON data files
- Consent/disclaimer gate screen + Home screen
- **Also on Day 1: a throwaway Capacitor Android build** to smoke out camera/mic
  permission problems early

**Open questions**
- ⚠ **Hard deadline date and hour still unknown** — needed to set cut-order trigger points
- Which 3 languages exactly confirmed? (assuming English + Tamil + Hindi)

**Watch out for**
- `capacitor.config` must never ship `server.url` — kills the APK on any other device
- Bundle MediaPipe `.wasm`/`.task` and Noto fonts locally, never CDN
- Demo Mode is a primary feature (Phase 3.5), not a last-day safety net
