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
- Manual browser click-through of the consent flow — no browser automation tool was available this session. **Verify yourself**: `npm run dev`, open `http://localhost:5173` in an incognito window, confirm Consent blocks first, acknowledging navigates to Home, reloading stays on Home.
- Push to GitHub — 8 local commits on `main` not yet pushed to `origin/main`, waiting on go-ahead
- Android Studio install (Track A) — in progress, not yet confirmed (`adb devices` should list your phone)
- Capacitor init + Android platform, manifest permissions, and the Day-1 throwaway camera/mic permission smoke test (Tasks 10–12 in the Phase 0 plan) — blocked on Android Studio finishing

**Watch out for**
- `npm audit` flags `react-router-dom@7.18.2` for a high-severity RSC-mode CSRF advisory — not applicable to us (plain client-side `BrowserRouter`, no RSC/server actions); deliberately not downgraded
- Windows Git warns about LF→CRLF line-ending conversion on every commit — cosmetic, not yet addressed with a `.gitattributes`

**Next up:** confirm Android Studio + `adb devices`, then Capacitor init → Android platform → permissions → Day-1 smoke test (Tasks 10–12).

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
