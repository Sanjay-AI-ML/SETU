# SETU

**A bridge between parents and speech-language pathologists.**

Built for **SmartAbility 2026** (REC + NIEPMD, Chennai) — Problem Statement 3:
*Parent-Mediated Communication Assessment*.

---

## ⚠ Important disclaimers — read first

- **SETU is not a diagnostic tool.** It does not detect, diagnose, or rule out any condition,
  including autism. It produces structured observations for review by a qualified clinician.
- **No real clinical data is used in this project.** This was built within a hackathon
  timeframe without ethics approval. Every piece of demo data is **self-recorded or
  simulated**, and is labelled as such inside the app.
- **The developmental age-check and response-latency thresholds are demo heuristics**,
  built from published milestone literature (cited below), not clinically validated values.
  They require calibration by qualified clinicians before any real-world use.
- Gaze signals are a **head-orientation proxy**, not validated eye tracking, and the
  underlying models degrade on infant faces.

## The problem

Families in remote and underserved parts of India lack timely access to speech-language
pathologists. Parents notice communication concerns first, but have no standardised way to
document them — so diagnosis and intervention are delayed.

## The approach

A parent runs short, story-guided play activities with their child. SETU:

1. Guides the parent through each activity with a simple script
2. Measures **response latency** — the gap between a parent's prompt ("serve") and the
   child's response ("return")
3. Observes vocalisations, gestures, and gaze on-device
4. Maps observed behaviour onto a developmental communication framework
5. Compares the child's strongest observed level against age-referenced developmental
   norms to flag a possible gap
6. Flags potential areas of concern
7. Generates a structured report for a clinician to review, shareable in-app or condensed
   into an SMS for offline handoff

## Features

1. **Parent-guided play activities** — Bubble Time, Peek-a-boo, Not-This-One, What's In The
   Box?, each mapped to a Communication Matrix purpose.
2. **On-device audio/video analysis** — Web Audio timing + MediaPipe Tasks Vision, nothing
   leaves the device, raw video is never persisted.
3. **Communication Matrix comparison** — 7 levels × 4 purposes, rule-based mapping engine
   with a tappable evidence trail on every cell.
4. **Response latency measurement** — parent-prompt-to-child-response timing, visualised on
   a per-trial ribbon.
5. **Developmental age-gap check** — the child's strongest observed Communication Matrix
   level is compared against published age-referenced milestone bands (babbling stages,
   first words, symbolic combination — see citations) to flag whether observed behaviour
   is on-track, ahead, or behind the child's stated age. Rule-based and explainable, in the
   same spirit as the Matrix engine — not a black-box model, because no clinically-labelled
   training data exists to build one responsibly within a hackathon timeframe.
6. **Concern detection** — rule-based flags, never a predicted diagnosis.
7. **Automated clinician report** — printable/shareable, includes the Matrix profile,
   latency ribbon, flags, and age-gap check.
8. **Offline SMS handoff** — a condensed summary (activity count, flag count, top concerns,
   age-gap status) can be sent straight to the native SMS composer with one tap — no
   backend, no internet required, works over a phone's own network when data is unavailable.
9. **Multilingual UI** — English, Tamil, Hindi via JSON i18n with bundled Noto fonts
   (no Google Fonts CDN, so the offline claim holds).

## In progress / next up

Scoped but not yet built in this pass — see `PROGRESS.md` for the live status:

- **Call-response activity** — a dedicated 5th activity where the parent calls the child's
  name without a visual cue, measuring whether/how the child orients (a well-established
  early screening signal), reusing the existing audio-onset + gaze pipeline.
- **Standalone 30-second video upload check** — a screen to pick or record a short video
  from the gallery (not tied to a live guided activity) and run it through the same
  on-device MediaPipe pipeline, sampled frame-by-frame from the file instead of a live
  camera, for a quick one-off screening entry point.

## What makes it different

Existing tools — [ASDetect](https://asdetect.org) (Australia) and SenseToKnow (Duke) — are
autism-specific classifiers. SETU differs on several axes:

- **Response latency as a core signal.** Neither competitor uses it.
- **Developmental stage-mapping, not binary classification.** Serves multiple disability
  types — hearing loss, speech delay, cerebral palsy, autism and others — rather than one.
- **Age-referenced gap check that stays explainable.** Every flag traces back to a
  published milestone citation and an observed rule, not an opaque model score.
- **Built for low-bandwidth rural India.** On-device processing; only lightweight feature
  data would ever sync, never raw video. Offline SMS handoff when there's no data signal.
- **Closes the loop to a clinician.** Produces a reviewable report, not just a parent-facing
  score.

## Communication Matrix — attribution

SETU maps observations to the **Communication Matrix**, a seven-level developmental
communication framework created by **Dr. Charity Rowland, Oregon Health & Science
University** — <https://communicationmatrix.org>.

**SETU is not the Communication Matrix and is not affiliated with or endorsed by its
authors or OHSU.** It is an independent tool that maps its own observations onto the
framework's structure for the purpose of a student hackathon prototype. The Communication
Matrix is a copyrighted instrument; **any real-world or commercial deployment of SETU would
require permission from the rights holder.**

## Age-norm citations

The developmental age-check bands (`src/data/age-norms.json`) are compiled from:

- Oller, D. K. (2000). *The Emergence of the Speech Capacity.* Lawrence Erlbaum Associates.
- Owens, R. E. (2020). *Language Development: An Introduction* (10th ed.). Pearson.
- Berk, L. E. (2018). *Development Through the Lifespan* (7th ed.). Pearson.
- Paul, R., Norbury, C. F., & Gosse, C. (2018). *Language Disorders from Infancy through
  Adolescence* (5th ed.). Elsevier.

## Tech

React + Vite, wrapped in Capacitor for Android · Web Audio API for timing ·
MediaPipe Tasks Vision for in-browser gesture/face analysis · rule-based JSON mapping engine
(deliberately not ML, for explainability) · client-side report generation · native `sms:`
intent for offline report handoff · no backend, no paid APIs

## Roadmap — explicitly not built in this prototype

Stated honestly so the current scope isn't overclaimed:

- Silero VAD for proper voice activity detection
- AI4Bharat IndicWhisper / Indic Parler-TTS for regional-language speech
- iCatcher / OWLET infant-specific gaze models
- Trained on-device ML classifier for age-gap detection (see disclaimer above on why this
  is rule-based instead)
- Offline sync via SQLite + WorkManager

## Status

Implemented: activities, latency, vision, Matrix mapping, flags, reports, age-gap check,
SMS handoff, Android build. In progress: call-response activity, video-upload check
(see "In progress / next up"). Running log: [`PROGRESS.md`](PROGRESS.md).
