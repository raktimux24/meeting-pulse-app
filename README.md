# Meeting Pulse

Your calendar tracks time. Meeting Pulse tracks the cost.

Meeting Pulse is a local-first Expo app for reflecting on meeting energy, clarity, and momentum. It stores data in on-device SQLite, generates deterministic weekly insights, and creates privacy-safe report cards for native sharing.

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

Reflections stay on the device. There is no account, analytics, or cloud sync. Export and import JSON yourself if you want a backup or to move to another phone. The shareable weekly report never includes meeting names, notes, or attendee details.
