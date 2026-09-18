# Control Tower 0.6 — Deep UX Recovery One Pager

## North Star
Ariel opens the app and understands the portfolio, freshness, and required actions in under 10 seconds.

## User feedback driving the run
- 0.5 light theme is not desirable; return to softer dark.
- Status must be Hebrew.
- Last meaningful project action must have a prominent date/time wall.
- Information density/relevance is still too weak.
- Chief of Staff project coverage appears incomplete.
- UX must become genuinely pleasant for daily repeated use.

## Hard requirements
- dark-but-not-black design;
- Hebrew operational status;
- explicit last_meaningful_progress + last_control_check;
- absolute + relative timestamp on every project;
- stale/unknown treatment;
- canonical six-project coverage reconciled against Chief of Staff fixture mismatch;
- Home prioritizes needs-Ariel/red/stale;
- no dead-end navigation;
- real visual review + one remediation pass.

## Known discrepancy
Live board: Ariel Life OS, Household OS, Personal News Radar, Tom AI Learning, Nutrition App, Chief of Staff.
Chief of Staff fixture: Household OS, Nutrition App, AI Control Tower, Tom AI Learning, News Agent, Chief of Staff.
This mismatch must be resolved explicitly; do not hide it.

## Non-goals
No new auth model. No Supabase. No architecture rewrite for its own sake.

## Gate
Engineering GREEN after tests/build/artifact.
Product AMBER until Ariel physical-device acceptance.
