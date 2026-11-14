# Meeting Pulse: design, dev and product evaluation

Reviewed 14 Nov 2026 on the iPhone 18 Pro Max simulator (iOS 27.2, Expo Go) plus a full read of `src/`.

**How it was checked.** I walked onboarding, both log steps, the result screen, Today, Insights (current week and the demo week), the report preview, History, a meeting detail and Settings. Typecheck is clean and all 34 unit tests pass. Not exercised: Android, the share sheet, JSON export, edit and delete flows (those are judged from code only).

---

## 1. Verdict

The visual direction is strong: the dark palette, the serif/sans pairing and the coral accent give the app a clear identity. Three things hold it back from feeling premium:

1. **The glow effects are flat discs.** Every "ambient glow" is a solid circle at low opacity, so it shows a hard edge on every screen.
2. **There is almost no motion.** The only animation is one fade-and-rise of the whole screen. Reanimated 4 is installed but never used.
3. **The numbers are easy to distrust.** One meeting produces a "Draining Week", and a week containing a −11 and a −8 is labelled "Neutral Week".

---

## 2. Design: defects seen on screen

Ordered by how much each one costs the "premium" feel.

| # | Where | What is wrong | Fix |
|---|---|---|---|
| 1 | Every screen, hero cards, result orb | Glows render as hard-edged discs (`ambientOrb` in `ui.tsx`, `heroGlow`, `orbGlow`). The result orb shows a visible inner circle behind the score. | Draw real radial gradients with `react-native-svg` (already installed). |
| 2 | Today, Insights, detail, report | The big score touches its label ("ENERGY BALANCE" sits on top of −7.6). `hero` text is 43px with a 44px line height. | Raise line height to about 52 and add 6pt between label and number. |
| 3 | All scores | `formatSigned` prints a hyphen (-7.6); onboarding uses a true minus (−6). In the serif the hyphen is short and sits low. | Use U+2212 everywhere. |
| 4 | Today hero | The round indicator is empty; the direction arrow does not show (seen with a negative score). | Cause not confirmed; the icon is rotated via `style`, so check that first. |
| 5 | Insights hero | −0.6 is drawn in red next to the words "Neutral Week". Colour follows the sign, the label follows thresholds. | Drive both from the same classification. |
| 6 | Insights week switcher | Past weeks read "Nov 2" above "Nov 2 – Nov 8". | Show "Last week" or "2 weeks ago" on the top line. |
| 7 | Week chart | Days with no meetings show a green bar; negative bars grow upward like positive ones. | Centre baseline, bars up for return and down for cost, empty days empty. |
| 8 | Mood grid, Insights snapshot grid | Two-column grids stop about 4pt short of the right margin (`width: '48%'` plus a fixed gap). | Use `flex: 1` columns in rows. |
| 9 | Mood card, selected | The label jumps upward when the tick appears, and the card loses its red or green tint. | Reserve the tick's space; keep the tint and add the ring. |
| 10 | Meeting card | The colour rail is clipped into a curved sliver; there is an empty band under the meta row (`minHeight: 132`). | Inset the rail as a rounded bar; drop the min height. |
| 11 | Headers | The eyebrow dot sits lower than the eyebrow text. | Remove the `marginBottom` on the eyebrow inside the row. |
| 12 | Insights hero, Today hero | Large dead area at the bottom of the card (`minHeight: 340` and `236`). | Let content set the height. |
| 13 | Log, Settings, Report, Detail | Three stacked titles: nav bar title, eyebrow, display title ("Settings" then "Settings & privacy"). | Keep the display title, drop the bar title or the eyebrow. |
| 14 | Log step 1 | The native date and time chips are system grey, and the date is stated three times in one card. | One row: "Today, 3:43 PM" that opens the picker. |
| 15 | Alerts | System alerts appear as light glass over a dark app. | Use an in-app sheet for confirmations. |
| 16 | Buttons | Forward buttons put the arrow before the label ("› Continue", "→ Done"). | Trail the arrow. |
| 17 | Detail | "30 minutes" wraps to two lines and breaks the row. | Use "30 min". |
| 18 | Result | The formula reads "1.2× × ... +"; the doubled × looks like a typo. | Show "−3 × 1.2 − 4 = −7.6" as one line. |
| 19 | Onboarding | Uneven vertical gaps (`space-between` on a tall screen); the tags overlap the orbit rings. | Group hero and copy; anchor the tags on the ring. |
| 20 | Type | 20px bold is used for card titles, stat values and whole sentences of advice; stat numerals are serif on the report and sans on Today. | Add a 17px medium "lead" style for sentences; pick one numeral face. |

**Contrast.** White text on the coral button and selected pill is about 2.6:1 (needs 4.5:1 for 13px text). Placeholder text uses `lineDark` (white at 20%) and is barely legible. Darken the coral under text or use dark ink on it.

---

## 3. Motion: where it earns its place

Build three shared pieces first, then apply per screen. Honour the system Reduce Motion setting throughout.

- **Press feedback.** A spring scale in place of the instant opacity swap, with a light haptic on pills, steppers and mood cards.
- **Rolling number.** One component that counts between values; reuse for every score.
- **Staggered entrance.** Sections rise in sequence (40ms apart) instead of the whole screen as one block.

| Screen | Motion |
|---|---|
| Onboarding | Score bubble breathes slowly; orbit rings counter-rotate; tags float in one after another; the score counts down to −6. |
| Log | Progress bar fills; step 1 to 2 slides sideways and resets scroll to the top; stepper values roll; the mood card's tint blooms and the tick draws on select. |
| Result | The ring draws around the orb, the score counts up and lands with a haptic, the formula parts resolve left to right, then the advice card rises. This is the app's payoff moment and is fully static today. |
| Today | Score rolls when a meeting is added; the direction arrow rotates to its state; a new card slides into the list. |
| Insights | Bars grow from the baseline in sequence; changing week slides content in the direction travelled; snapshot cards stagger in. |
| History | Cards reflow when a filter changes; date headers stick. |
| Detail | The score chip on the card expands into the detail hero. |
| Report | One sheen sweep across the card when it appears. |
| Tab bar | Active icon springs; an indicator pill slides between tabs. |

---

## 4. Scoring and insight logic

Current formula (`scoring.ts`): mood score (−3 to +3) × duration multiplier (1 to 2.5) + sum of reason modifiers.

| # | Issue | Evidence | Suggested change |
|---|---|---|---|
| 1 | Reasons can overturn the mood. | "Drained" for 15 min with three positive reasons scores +4, shown as "Energy returned". Reasons range from −13 to +9; mood tops out at ±7.5. | Cap the reason total (for example ±3), or make reasons explanatory and leave the score to mood and duration. |
| 2 | Weekly pulse is a raw sum with fixed thresholds. | One meeting gives "Draining Week". The demo week (+6, −8, +6.4, −11, +6.6, −6, +5.4, 0) nets −0.6, "Neutral Week". | Report average per meeting (or per hour) and show the spread: "4 gave energy, 3 cost it". Require 3 meetings before naming the week. |
| 3 | Snapshot cards assert patterns from one data point. | With one meeting: "Most draining: Standup", "Top friction: No decision", while the coach card says "1 of 3 meetings logged". | Apply the same minimum-sample rule to the snapshot. |
| 4 | Insight thresholds rarely fire. | The demo week, built to tell a story, produces one insight. Async needs 3 tags (has 2), long meetings need 2 (has 1), "needs a reset" needs 3 of one type in a week. | Compute insights over a rolling 4 weeks; keep the weekly view for the score. |
| 5 | Ties are settled by accident. | "No decision" and "Could have been async" both appear twice; the winner depends on row order, and the no-decision insight only fires if it wins. | Break ties by total modifier weight, then recency. |
| 6 | Reason order is lost. | I picked "Unclear ownership" first; the card shows "No decision". `GROUP_CONCAT` has no order. | Store a position column, or show the heaviest reason. |
| 7 | Neutral meetings cost nothing at any length. | 0 × multiplier = 0, so a three-hour neutral meeting scores 0. | Add a small time cost above 60 minutes. |
| 8 | Mood scale is uneven and visible. | Three positive moods, four negative; "Anxious" equals "Frustrated" at −3; the numbers are printed on the cards. | Hide the numbers while choosing; review the weights. |
| 9 | Scores are stored with no formula version. | `impact_score` is saved at write time. | Add a `score_version` column and a recompute migration. |
| 10 | "One thing to try" and "One fix for next week" can be praise. | Demo report's fix reads "Your best calls stay under 30 minutes". | Pick the top negative insight for the fix; label positives "Keep doing". |
| 11 | Start time defaults to now. | You log after a meeting, so "now" is the end. | Default to now minus duration. |
| 12 | People count is never scored. | Only used in one insight (`> 2`). | Either use it (cost per attendee) or stop asking for it. |

---

## 5. Engineering

- **Silent failures.** No database call has error handling. `save` in `log.tsx` uses `try/finally` with no `catch`, so a failed write shows nothing.
- **Empty-state flash.** Lists start as `[]`, so "No signal yet" renders before the first query returns. Add a loading state.
- **Stale dates.** Today and Insights read `new Date()` once at mount; the app shows yesterday after midnight until restarted.
- **Step 2 opens scrolled to the bottom** (seen): the scroll offset carries over from step 1.
- **History loads everything** into a `ScrollView`. Move to a virtualised list with paging.
- **Tab bar height is hard-coded** (86 with 15 bottom padding) and ignores the safe-area inset.
- **Tokens are bypassed.** Many inline `rgba(...)` values and one hard-coded font name in `insights.tsx`.
- **Unused packages.** Not imported anywhere in `src/`: `@expo/ui`, `expo-glass-effect`, `expo-symbols`, `expo-image`, `expo-device`, `expo-web-browser`.
- **Onboarding navigation** relies on `setTimeout(() => router.push('/log'), 0)`.
- **Accessibility.** Text scaling is capped at 1.35×; mood cards have no accessibility label.
- **Tests** cover the domain only. Nothing covers the repository or any screen.
- **Data safety.** Export exists, import does not; a lost phone loses everything.
- **Expo** is on 57.0.4; 57.0.33 is available.

---

## 6. Product

1. **Logging takes too long for the promise.** The copy says "20 seconds", but there are six inputs before the mood question, which is the point of the app. Ask the mood first; prefill the rest from recent meetings.
2. **Calendar import is the biggest lever.** Reading the device calendar (on-device, no network) removes name, duration, time and attendee entry and keeps the privacy promise.
3. **Nothing brings the user back.** Add an optional local end-of-day reminder.
4. **One metric has four names:** Energy balance, Meeting pulse, Mood balance, Meeting impact. The split has four more: "Up · even · down", "Returned / Neutral / Cost", "Return / cost", "Positive / Neutral / Negative". Pick one of each.
5. **Onboarding shows something the app doesn't do.** "Clarity −2" implies per-dimension scores; there is one score.
6. **Labels judge too hard.** "Meeting Damage Week" and "High cost" after one 30-minute call. Soften them.
7. **No view beyond one week.** Add a 4 to 8 week trend and lifetime averages per meeting type; group recurring meetings by name.
8. **History** needs search, and the filters take half the first screen. Collapse them into one filter button.

---

## 7. Suggested order

1. **Trust fixes** (small): minimum-sample rules, cap on reasons, tone/label match, week label, chart baseline, true minus sign, error handling.
2. **Polish pass** (small): real gradients, number/label spacing, grid alignment, card rail, contrast, title stacking.
3. **Motion foundation** (medium): the three shared pieces, then Result, Insights and Log.
4. **Logging redesign** (medium): mood first, prefill, start-time default.
5. **Larger bets**: calendar import, rolling-window insights, reminders, import/backup.

*Simulator state left behind: one test meeting ("RoadmapRoa") and the eight built-in demo meetings. "Delete all meeting data" in Settings clears them.*
