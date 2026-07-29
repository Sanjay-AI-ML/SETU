# SETU — Project Context

> Loaded automatically every session. Keep dense; this is working memory, not documentation.

## What this is

**SETU** (Sanskrit: *bridge*) — a parent-mediated communication assessment app.
Built for **SmartAbility 2026** (REC + NIEPMD, Chennai), **Problem Statement 3**.

A parent runs short, story-guided play activities with their child. The app records
audio/video, measures **response latency** (prompt "serve" → child "return") alongside
vocalisations/gestures/gaze, maps observed behaviour to the **Communication Matrix**,
flags concerns, and generates a structured report for a clinician.

**Solo build, ~5 days, AI-assisted.** Hackathon demo — not production, not a medical device.

## Hard constraints — do not violate

- **No backend. No paid APIs.** Everything client-side.
- **No real clinical data.** No ethics approval in this timeframe. All demo data is
  self-recorded or simulated and **must be labelled as such in-app**.
- **Matrix mapping is rule-based JSON — deliberately NOT ML.** For speed and explainability.
  Do not "improve" this with a model.
- **Never commit audio/video of a child.** See `.gitignore`.
- The app must **never imply a diagnosis**. Screening support for clinician review only.

## Stack (decided — do not change)

React + Vite → Capacitor → Android APK · Web Audio API (timing) ·
`@mediapipe/tasks-vision` (gesture/gaze/face, in-browser) · rule-based JSON matrix engine ·
client-side templated reports · `idb-keyval` persistence · React Router · Context + useReducer

No Redux/Zustand/query libs. No SQLite/offline sync (roadmap only).

## Roadmap — state honestly, do NOT build

Silero VAD · AI4Bharat IndicWhisper · Indic Parler-TTS · iCatcher/OWLET infant gaze models ·
native Android on-device inference · offline sync (SQLite + WorkManager)

## The six required features (all must be visible)

1. Parent-guided activities → Pre-brief + Run screens
2. AI audio/video analysis → `core/latency` + `core/vision`
3. Communication Matrix comparison → `core/matrix` + Grid
4. Response latency measurement → `core/latency` + Ribbon
5. Concern detection → `core/matrix/flags` (rule-based, never predicted diagnosis)
6. Automated clinician report → `core/report`

## Communication Matrix — the framework

7 levels × 4 purposes = 28-cell grid. Each cell: `mastered | emerging | not-used | surpassed`.

**Levels:** I Pre-Intentional · II Intentional · III Unconventional · IV Conventional ·
V Concrete Symbols · VI Abstract Symbols · VII Language
**Purposes:** Refuse · Obtain · Social · Information

⚠ **Licensing:** Charity Rowland's copyrighted instrument (OHSU, communicationmatrix.org).
Attribute prominently. Describe levels **in our own words** — do not copy descriptors verbatim.
SETU *maps to* the framework; it **is not** the Communication Matrix. NIEPMD judges know it well.

## Decisions that carry the design

- **Evidence trail on every cell** — `{sessionId, activityRunId, observationCode, ruleId}`.
  This is *why* rules beat ML here. Grid cells must be tappable to reveal it.
- **Timing via Web Audio clock**, anchored once to `performance.now()`. Never `Date.now()`.
- **Raw video is never persisted** — frames → MediaPipe → features → discard.
- **Parent tap is ground truth**, not a fallback hack. It *is* parent-mediated assessment,
  and it makes the app language-agnostic (no ASR needed to confirm Level VII).
- **`core/` contains zero React** — latency maths and rules engine test under plain Vitest.
- **`surpassed` semantics must be implemented** — higher level achieved marks lower levels
  in that column surpassed.
- **Latency bands are unvalidated demo heuristics.** Keep in `latency-bands.json`, label as
  such in-app and in the report. Never present as clinically derived.

## Activities

| Activity | Purposes | Notes |
|---|---|---|
| Bubble Time | Obtain, Social | **The vertical slice — build first** |
| Peek-a-boo | Social | Best fit for MediaPipe face signals; **first to cut if time slips** |
| Not-This-One | **Refuse** | Refuse won't appear incidentally — needs its own activity |
| What's In The Box? | Information | Reaches Levels V–VII |

## Deliverables

**APK upload + pitch deck + live demo + walkthrough.** Deadline hour: *TBD — still unknown.*

The APK is opened by a judge **alone, with no child and no props**. Therefore:
- **Demo Mode is a primary feature, not a safety net** (Phase 3.5).
- **`capacitor.config` must never ship `server.url`** — that builds an APK pointed at your
  dev server. Works on your machine, dead everywhere else. Classic submission killer.
- Test the APK on a device that has never seen your dev environment.

## Multilingual

**In scope:** UI strings, parent scripts, report copy via JSON i18n — English + Tamil + Hindi.
**Out of scope:** ASR/TTS (IndicWhisper, Parler-TTS are roadmap).

Bundle **Noto Sans + Noto Sans Tamil + Noto Sans Devanagari locally** — Google Fonts CDN
breaks the offline claim and renders tofu. Tamil strings run longer than English; test layouts
in Tamil, not just English.

## Build phases

0 Scaffold → **1 Vertical slice (Bubble Time, parent-tap only — demo-safe baseline)** →
2 Audio onset → 3 Full activities + rules → **3.5 Demo Mode** → 4 MediaPipe (highest risk,
deliberately late) → 5 Report → 6 Android → 7 Hardening

**Do a throwaway Capacitor build on Day 1.** Android camera/mic permissions are the classic
multi-hour sink; discovering that on Day 5 is fatal.

**Pre-agreed cut order under time pressure:** drop Peek-a-boo → reduce vision to
face-presence + hand-raise → ship parent-tap only. Phase 1 guarantees a demo regardless.

## Working agreement

- Project root: `D:\Smart Ability Hackathon\SETU` — **never write outside it**.
- **Always launch Claude Code from the project root** so this file auto-loads.
- Full plan: `docs/plans/2026-07-30-setu-architecture-plan.md`
- Running status: `PROGRESS.md` — **update it at the end of every working session.**
- Pushing to GitHub (`Sanjay-AI-ML/SETU`, private) daily.

## Current status

Planning complete and approved. **No code written yet.** Next: Phase 0 scaffold.
