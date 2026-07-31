# SETU — Progress Log

> **Where we left off.** Update at the end of every working session.
> Newest entry at the top.

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

**Watch out for**
- Do not run `taskkill /IM node.exe` (or any blanket kill-by-image-name) to stop a dev server — it kills every Node process system-wide, including MCP tool servers and any unrelated Node apps. Target the specific PID instead.
- **Avast Antivirus's "Web/Mail Shield" does HTTPS interception on this machine** — it MITMs TLS connections (e.g. `dl.google.com`) with a self-signed `Avast Web/Mail Shield Root` CA that's trusted by Windows but NOT by Java's bundled `cacerts` truststore. This broke `sdkmanager` with `PKIX path building failed`. Fixed by exporting the Avast root CA from the Windows cert store and importing it into a writable copy of the JBR's cacerts at `%LOCALAPPDATA%\Android\setu-cacerts` (password `changeit`), then passing `-Djavax.net.ssl.trustStore=...` via the `SDKMANAGER_OPTS` env var. **This will very likely bite Task 12 too** — `./gradlew assembleDebug` downloads the Gradle distribution and dependencies over HTTPS and will probably hit the same PKIX error. If so, point Gradle at the same patched trust store (`GRADLE_OPTS="-Djavax.net.ssl.trustStore=%LOCALAPPDATA%\Android\setu-cacerts -Djavax.net.ssl.trustStorePassword=changeit"`, or add the equivalent to `gradle.properties`) rather than re-deriving this from scratch.
- Also note: `curl.exe` on this machine needs `--ssl-no-revoke` for the same reason (schannel revocation-check failures against the Avast-intercepted chain).

**Next up:** the one remaining piece of Task 0 needs the user physically — enable USB debugging on the test phone (Settings → About phone → tap Build number 7× → Developer options → USB debugging), plug it in via USB, accept the "Allow USB debugging?" prompt, then confirm `adb devices` lists it with `device` status (not `unauthorized`). Once that's done, Tasks 10–12 (Capacitor init → Android platform → permissions → Day-1 smoke test) are unblocked. Tasks 0–9 are otherwise fully done.

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
