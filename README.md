# SETU

**A bridge between parents and speech-language pathologists.**

Built for **SmartAbility 2026** (REC + NIEPMD, Chennai) — Problem Statement 3:
*Parent-Mediated Communication Assessment*.

---

## ⚠ Important disclaimers — read first

- **SETU is not a diagnostic tool.** It does not detect, diagnose, or rule out any condition.
  It produces structured observations for review by a qualified clinician.
- **No real clinical data is used in this project.** This was built within a hackathon
  timeframe without ethics approval. Every piece of demo data is **self-recorded or
  simulated**, and is labelled as such inside the app.
- **Response-latency thresholds are demo heuristics, not clinically validated values.**
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
5. Flags potential areas of concern
6. Generates a structured report for a clinician to review

## What makes it different

Existing tools — [ASDetect](https://asdetect.org) (Australia) and SenseToKnow (Duke) — are
autism-specific classifiers. SETU differs on four axes:

- **Response latency as a core signal.** Neither competitor uses it.
- **Developmental stage-mapping, not binary classification.** Serves multiple disability
  types — hearing loss, speech delay, cerebral palsy, autism and others — rather than one.
- **Built for low-bandwidth rural India.** On-device processing; only lightweight feature
  data would ever sync, never raw video.
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

## Tech

React + Vite, wrapped in Capacitor for Android · Web Audio API for timing ·
MediaPipe Tasks Vision for in-browser gesture/face analysis · rule-based JSON mapping engine
(deliberately not ML, for explainability) · client-side report generation · no backend

## Roadmap — explicitly not built in this prototype

Stated honestly so the current scope isn't overclaimed:

- Silero VAD for proper voice activity detection
- AI4Bharat IndicWhisper / Indic Parler-TTS for regional-language speech
- iCatcher / OWLET infant-specific gaze models
- Native Android on-device inference
- Offline sync via SQLite + WorkManager

## Status

**Planning complete. Implementation not yet started.**
Architecture plan: [`docs/plans/2026-07-30-setu-architecture-plan.md`](docs/plans/2026-07-30-setu-architecture-plan.md)
