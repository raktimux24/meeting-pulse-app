# ADR 001: Outcome, recovery, guardrail, and sharing boundaries

## Status

Accepted for local implementation.

## Context

Meeting Pulse needs to help a person act on meeting patterns without expanding into surveillance, calendar monitoring, or prescriptive productivity scoring. The source research suggested outcome checks, recovery awareness, private limits, and team-level experiments, but those ideas need stricter product boundaries before implementation.

## Decision

1. Outcome answers are optional, nullable meeting attributes and never modify the impact score.
2. Recovery calculations use only meetings logged in Meeting Pulse. They report transitions and consecutive logged-meeting blocks, not focus time, workload, or calendar availability.
3. Meeting budgets are private preferences, disabled by default, evaluated only against logged meetings, and excluded from report text and team shares.
4. Team experiments come from a reviewed static allowlist keyed by deterministic insight IDs. Share text cannot interpolate meeting titles, notes, attendees, scores, outcome answers, or budget values.
5. No analytics, recording, cloud account, or AI service is introduced. Optional Calendar Assist requires a separate explicit tap and permission, reads a two-day window locally, keeps only start time and duration in memory, and stores nothing until the user saves a reflection.

## Consequences

- Older databases and exports remain valid because new meeting fields are nullable and import defaults them to `null`.
- Recovery and budget summaries are intentionally incomplete when a user does not log every meeting; the interface says so.
- The app cannot automatically prove that an experiment worked. A user may pin a private intention, but sharing and interpretation remain deliberate actions.
- Calendar assistance cannot silently import events or retain event titles, attendees, notes, locations, calendar identifiers, or organizational relationships.
