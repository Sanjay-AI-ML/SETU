# Demo runbook — Phase 7 hardening

Phase 7 per the architecture plan is rehearsal + a backup video + deck screenshots.
The rehearsal and video recording are yours to do — this doc is the script and
checklist to run them against, plus where the deck screenshots landed.

## Deck screenshots

Captured live from `npm run dev` this session, saved outside git (project
convention — no demo media in the repo, see `.gitignore`):

```
C:\Users\sanja\AppData\Local\Temp\claude\C--windows-system32\7f286de7-00ac-4800-bdd4-7bed8554dc62\scratchpad\
  deck-01-home.png
  deck-02-overview.png
  deck-03-prebrief.png
  deck-04-run-ready.png
  deck-05-run-waiting.png
  deck-06-results.png      (full 4-activity Matrix + Ribbon, via Demo Mode)
  deck-07-report.png       (Clinician Report, via Demo Mode)
```

That temp folder is session-scoped and will eventually get cleaned up by the
OS — copy anything you want to keep into the deck project now.

## Pre-flight checklist (run this before the actual demo, not day-of)

- [ ] Phone charged above ~80%, screen brightness up, do-not-disturb on (a
      notification banner mid-demo is exactly the kind of thing a judge remembers)
- [ ] APK reinstalled fresh from the latest build (`Session 9`/`10` code — if
      you've made any changes since, rebuild: `npm run build && npx cap sync
      android`, then run the `gradlew assembleDebug` command yourself via `!`,
      same as last time)
- [ ] Test the app **offline** (airplane mode) at least once before the real
      thing — this is a core claim (architecture doc 8.4) and the one thing
      that's genuinely embarrassing to discover live
- [ ] Mic + camera permission already granted once on the phone (so the OS
      prompt doesn't interrupt the live flow) — Settings → Apps → SETU →
      Permissions, or just let it prompt once during a rehearsal run
- [ ] Volume up enough that the serve tone (660Hz beep) is audible, but not
      so loud it's startling on stage
- [ ] A **second device** (laptop, tablet) open to `/session/results` in Demo
      Mode as instant fallback, or the backup video cued up and ready to play
      within one tap if the live run goes sideways
- [ ] Know your bailout trigger in advance: if a real child is uncooperative
      or the room's too loud for onset detection past ~45–60 seconds into an
      activity, stop narrating the live attempt and pivot straight to Demo
      Mode ("here's a completed session so you can see the full picture") —
      don't let dead air on stage become the story

## Live demo script

**Two tracks. Decide before you're on stage which one you're running, and
have the other ready as the pivot.**

### Track A — real child + bubbles (the ideal path, ~3–4 min)

1. **Home** — one line on what SETU is: a screening-support tool for early
   communication development, built around 4 short structured play activities.
2. **Start new session → Session Overview** — point out all 4 activities are
   queued, fixed order, this is one continuous session.
3. **Bubble Time Prebrief** — narrate the calibration step out loud
   ("SETU is listening to the room's baseline noise for a few seconds") —
   this is the one moment worth slowing down on, it's the least visually
   obvious feature (dual-source detection) and won't speak for itself later.
4. **Run** — blow bubbles, let the child (or you, standing in) respond once
   or twice, tap "No response" once deliberately to show that path too. If a
   real audio onset fires, point out the ring around that dot on the Ribbon
   later — don't promise it will happen; if it doesn't, the parent-tap
   channel is exactly the fallback the design is built around, so say that.
5. **Review → repeat through all 4 activities** — you don't need to run all
   4 live if time is short; 1–2 live, then say "for time, here's what a full
   4-activity session looks like" and pivot to Demo Mode for Results/Report.
6. **Results** — this is the payoff screen. Point at the Matrix Grid,
   explain the 4 columns (purposes) × 7 rows (levels) in one sentence, and
   the color legend. Mention the Communication Matrix attribution out loud —
   it reads as rigor, not a footnote.
7. **Report** — "this is what goes to a clinician" — point at the
   disclaimers section explicitly. Judges from a clinical background will
   specifically be checking whether you overclaim; reading one disclaimer
   line aloud pre-empts that.

### Track B — Demo Mode only (no child, no props, ~90 sec)

Use this if there's no child available, or as the fallback mid-Track-A pivot.

1. **Home → "Try demo (no child needed)"** — one tap, land straight on
   Results with a fully populated session.
2. Same Results/Report narration as Track A steps 6–7.
3. Explicitly say once: "this is seeded data for the demo — the live
   4-activity flow is the same screens you'd see with a real child, one tap
   away." Don't let it pass as if it were a real run.

## Backup video — what to actually record

Record **before** the event, not as a last-minute scramble:

- Prefer Track A end-to-end if you can get a cooperative child + quiet room
  for 5 minutes — this is the strongest possible artifact.
- If not, record Track B (Demo Mode) plus a *separate* clip of one live
  Bubble Time trial (Prebrief → one serve → one tap-response → Review) so
  the video still shows the real interaction loop, not just seeded data.
- Screen-record the phone (Android's built-in screen recorder, or
  `scrcpy`/`adb shell screenrecord` if you want a laptop copy) rather than
  filming the screen with another camera — much more legible when played
  back on a projector.
- Save it outside git per the `.gitignore` rule at the top of this repo —
  video of a child must never enter version control, even a private repo.
