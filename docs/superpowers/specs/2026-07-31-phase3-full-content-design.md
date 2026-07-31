# Phase 3 — Full Content: Design

Status: approved by user (via targeted questions, not full interactive brainstorm — decisions below), ready for implementation planning.

## Purpose

Per the architecture doc's Phase 3 ("Full content"): all 4 activities, full rules
coverage, session-wide aggregation. Currently only Bubble Time is wired into
the UI (hardcoded in 4 route files); `matrix-rules.json` only covers Bubble
Time's 5 observation codes; Session Results/Report only look at the last
activity run.

## Decisions locked in

- **Fixed order, all 4 activities, no skipping.** `activities.json`'s array
  order is the session order: Bubble Time → Peek-a-boo → Not-This-One →
  What's-In-The-Box. No activity-picker UI.
- **Results/Report pool across all 4 activity runs**, not just the last one.
  Ribbon shows all trials from the whole session; Matrix Grid merges
  observations from every activity run into one 28-cell profile.
- **Rules coverage: one rule per unique observation code** across all 4
  activities (not exhaustive 28-cell coverage) — matches the architecture
  doc's own bar ("Grid fills plausibly across all 4 columns"). Some
  levels/purposes will legitimately stay unreachable (e.g. Concrete/Abstract
  multi-word Language) — that's honest, not a gap to paper over.

## Current-activity derivation

`session.activityRuns` only gains an entry on `COMPLETE_ACTIVITY_RUN` (the
in-progress run lives separately in `state.activityRun` until then) — so
`session.activityRuns.length` is always exactly "how many activities are
fully done," including mid-activity. `currentActivity =
activities[session.activityRuns.length]` is therefore a safe derived value,
no new reducer state needed (matches the project's "deliberately minimal
state" philosophy).

`ActivityPrebriefPage`, `ActivityRunPage`, `ActivityReviewPage` all currently
hardcode `const bubbleTime = activities.find(a => a.id === 'bubble-time')` at
module scope. This becomes `const currentActivity =
activities[session.activityRuns.length]`, computed inside the component via
`useSessionState()`. Each of the three pages adds a guard: if
`!currentActivity` (all 4 already done, e.g. a stale direct navigation),
redirect to `/session/results` — same pattern as Phase 1's null-session
guards.

## Session Overview loop

Diagrammed in the architecture doc as the activity loop's hub. Shows all 4
activities with a done/not-done indicator and `{completed} of {total}`
progress. Button navigates to Prebrief for the next undone activity, or (once
all 4 are done) to Session Results. `ActivityReviewPage`'s `handleConfirm`
navigates back to `/session/overview` after each activity (not straight to
the next Prebrief) — the parent gets a breather screen between activities, and
Overview's own "all done" branch is what finally sends them to Results.

## Core aggregation: `mergeCells`

`applyRules` currently composes rule-matching and `applySurpassed` in one
call, so it can't be used per-run and then merged — "surpassed" is a derived
state that must be computed once, session-wide, not per-activity (merging
already-surpassed per-run flags would be meaningless). Split the existing
function:

- **`matchRules(observations, rulesConfig, context)`** — the existing
  rule-matching loop from `applyRules`, minus the final `applySurpassed`
  call. Returns raw (`not-used`/`emerging`/`mastered`) cells.
- **`applyRules`** becomes `matchRules(...)` → `applySurpassed(...)` —
  unchanged public behavior/signature, so nothing that already calls it
  breaks.
- **New: `mergeCells(cellsArrays)`** — merges N raw cell arrays into one 28-
  cell array. For each (level, purpose) pair, takes the highest-ranked state
  across all inputs (`not-used` < `emerging` < `mastered`) and concatenates
  evidence arrays.

Caller (`SessionResultsPage`, `ReportPreviewPage`) becomes:
```js
const perRunCells = session.activityRuns.map((run) =>
  matchRules(run.observations, rulesConfig, { sessionId: session.id, activityRunId: run.id })
);
const cells = applySurpassed(mergeCells(perRunCells));
```
Trials for the Ribbon: `session.activityRuns.flatMap((run) => run.trials)`.

## New matrix-rules.json entries

8 new rules for the 8 observation codes not yet covered (Bubble Time's 5 and
2 of the 4 pre-existing extras are already covered). Level choices reasoned
from `matrix-taxonomy.json`'s own descriptor text, not copied from any
external source (licensing constraint):

| Activity | Code | Level | Purpose | Reasoning |
|---|---|---|---|---|
| Peek-a-boo | `anticipatory-movement` | 1 (Pre-Intentional) | social | Descriptor: "reflects internal states... without intent to communicate" — anticipatory excitement is exactly this. |
| Peek-a-boo | `smile` | 2 (Intentional) | social | Intentional affective display, not necessarily a deliberate directed signal. |
| Peek-a-boo | `gaze-to-face` | 3 (Unconventional) | social | Descriptor explicitly lists "facial expression" as an L3 example. |
| Not-This-One | `head-turn` | 2 (Intentional) | refuse | A behavioral avoidance response, not yet a clearly directed signal. |
| Not-This-One | `vocal-protest` | 3 (Unconventional) | refuse | Vocal protest directed at the situation/parent — pre-symbolic signal. |
| Not-This-One | `word-no` | 6 (Abstract Symbols) | refuse | Spoken word, same tier as the existing `word` → social L6 rule. |
| What's-In-The-Box | `show` | 4 (Conventional) | information | Descriptor explicitly lists "showing" as an L4 example. |
| What's-In-The-Box | `comment` | 6 (Abstract Symbols) | information | Verbal commentary, spoken-word tier. |

No changes to the 7 existing rules from Phase 0/1.

## Testing

- `matchRules`/`mergeCells`: full TDD in `core/matrix`, following the
  existing test style (`applySurpassed` already has cross-purpose-column
  isolation tests to model the new tests on).
- `applyRules`'s existing tests must still pass unchanged (it's now a thin
  compose of the two new pieces).
- Route components (`SessionOverviewPage`, `ActivityPrebriefPage`,
  `ActivityRunPage`, `ActivityReviewPage`, `SessionResultsPage`,
  `ReportPreviewPage`): no Vitest coverage per existing project convention,
  verified via browser walkthrough running a full 4-activity session.
