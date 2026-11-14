# Branch merge summary

14 Nov 2026. All work is now combined on `integrate/all-branches` (merge commit 894c19a). `main` itself was only fast-forwarded to `origin/main`; nothing has been pushed.

## What each branch held

| Branch | Work not already in `main` | Outcome |
|---|---|---|
| `origin/main` (dadd59b, 26 Oct) | The base: Quick Pulse, full reflection, feature guide, intended outcome, outcome check, calendar assist, team experiments, budgets, recovery radar, custom reasons and types, undo, import/export | Base of the integration branch |
| `codex/meeting-pulse-outcomes-recovery` | None (same commit as `origin/main`) | Nothing to merge |
| `origin/cursor/meeting-pulse-improvements-a4c0`, `premium-ui-and-custom-types-a4c0`, `ios-push-capability-a4c0` | None (already in `origin/main`) | Nothing to merge |
| `origin/cursor/bump-version-1-0-1-a4c0` | App version 1.0.1 | Merged; kept `main`'s higher 1.0.2 |
| `claude/july-base-audit` (04d1cb2) | Today's audit fixes, polish and motion, made on the 10 July code | Merged into the latest code; see below |

The `refs/codex/turn-diffs/...` refs are Codex's internal file snapshots, not commits; there is nothing in them to merge.

## How conflicts were resolved

For every conflict the latest code's feature was kept and the July change was layered on top. Nothing from `main` was removed.

- **Scoring:** keeps custom reasons (custom reasons add no points); adds the +/-3 reason cap.
- **Database:** keeps `main`'s v2 (outcome columns) and v3 (intended outcome, Quick Pulse). The score recalculation moved to a new **v4**, which skips rows with an unknown mood.
- **Today:** keeps the feature guide, Quick Pulse / Full reflection, intention, recovery and guardrail cards. Adds a rolling score, a glow that takes the day's colour, and staggered entrances.
- **Log:** keeps the intended outcome, outcome check, live preview, recent titles and Quick Pulse completion. Adds focus after the sheet opens, step 2 opening at the top, slide transitions and springy controls.
- **Result:** keeps the missing-result state, outcome cards, View reflection, Edit again and Log another. Adds the drawn ring, the rolling score and the full formula line.
- **Insights:** keeps the day selection, week-over-week change, recovery, guardrails, recurring review, longer patterns, action kit and team experiments. Adds "Last week" / "N weeks ago", colour matched to the week label, snapshot cards hidden below 3 meetings, the week slide and the rolling score.
- **History:** keeps month headers, day totals, search and Reset filters. Adds staggered entrance.
- **Week chart:** keeps tappable days and adds diverging bars that grow in.
- **Shared UI:** keeps `Atmosphere`, the loading and not-found states, and the header Log button. Adds `PressableScale`, dark text on coral, the `lead` text style and true minus signs. The background's hard-edged disc glows are replaced with soft radial ones.
- **Navigation:** keeps all of `main`'s screen titles and new screens.

## Checks

- Typecheck and lint are clean.
- Jest: 19 suites and 93 tests pass. Jest now mocks Reanimated, Worklets and Haptics, and a new test covers the v4 migration.
- Simulator: the app bundles and launches. The test database upgraded from v1 to v4 with all 11 meetings kept. Today and Log were checked on screen.

## Outcome weighting (added after the merge)

The intended outcome and the outcome check now count toward the impact score.

- **Formula:** mood × duration + reasons (capped at ±3) + outcomes (capped at ±3).
- **Outcome check:** each "Yes" adds 1, each "No" takes 1 away, "Not needed" adds nothing.
- **Intended outcome:** a new question, "Did it produce “…”?", appears when an intended outcome was written. Yes adds 1.5, Partly 0.5, No takes 1.5 away.
- **No double counting:** a "No" on the decision or ownership question is skipped when "No decision" or "Unclear ownership" is already selected.
- **Storage:** database v5 adds `intended_outcome_met` and recalculates every stored score once. Import and export carry the new field.
- **Screens:** the outcome check shows the points live ("Adding +1.5 to your impact score"). The result screen shows an Outcomes term in the formula. Settings and onboarding describe the new formula.
- **Checks:** 19 suites and 100 tests pass, including new scoring and v5 migration tests. In the simulator the database upgraded to v5 with all 11 meetings kept, and editing a test meeting saved 6.9 as expected (Clear 2 × 1.2 + reasons 2 + outcomes 2.5).

## Not done yet

- The full design and product evaluation was written against the July app and needs re-running on this code.
