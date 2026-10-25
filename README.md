# Meeting Pulse

Your calendar tracks time. Meeting Pulse tracks the cost.

Meeting Pulse is a local-first Expo app for reflecting on meeting energy, clarity, and momentum. It stores data in on-device SQLite, generates deterministic weekly insights, and creates privacy-safe report cards for native sharing.

## Reflection tools

- **Outcome Check** optionally records whether a meeting ended with a decision, clear ownership, and a next step. These answers stay separate from the meeting impact score.
- **Recovery Radar** identifies short transitions and long consecutive blocks using only meetings logged in the app. It does not claim to measure focus time or the rest of your calendar.
- **Private meeting budget** lets you set optional on-device guardrails for weekly logged minutes, high-cost meetings, long blocks, and preferred buffers. It is off by default and is never included in shared reports.
- **Team experiments** turn supported insights into reviewed, privacy-safe suggestions, then ask whether the experiment helped.
- **Quick Pulse** captures a mood and one reason as an unscored draft that can be completed later.
- **Recurring reviews and longer patterns** help users choose whether to keep, shorten, move, or pause repeated formats and inspect weekday/time-of-day trends.
- **Optional Calendar Assist** reads only local start times and durations after explicit permission. Event titles, attendees, notes, locations, and calendar IDs are discarded rather than stored.

## Run locally

```bash
npm install
npm run ios
```

Use `npm run android` for Android or `npm run web` for the browser preview. The main mobile experience is designed for iOS and Android.

## Quality checks

```bash
npm run typecheck
npm test
npm run lint
```

In development builds, Settings includes a fixture loader for a complete demo week. Production builds never seed fake meetings.

## Privacy

Reflections, outcome checks, Quick Pulses, custom reasons, and meeting-budget preferences stay on the device. There is no account, analytics, recording, or cloud sync. Optional Calendar Assist is off by default, reads only when requested, and stores no calendar event content. Export and import JSON yourself if you want a backup or to move to another phone. Shareable weekly reports and team-experiment templates never include meeting names, notes, attendee details, intended outcomes, or private budget settings.
