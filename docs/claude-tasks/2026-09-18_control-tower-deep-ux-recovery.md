# Control Tower Android — Deep UX / Information Architecture Recovery 0.6

Date: 2026-09-18
Owner: Control Tower
Requested by: Ariel
Execution mode: autonomous deep run
Product gate: RED at start
Engineering branch: control-tower-apk-build

## 0. Why this run exists

The gateway connection works, but the app is still not a sustainable daily tool.

Latest real-device feedback from Ariel:
- the light theme is worse; return to a dark theme, but materially lighter/softer than the original near-black version;
- status copy must be in Hebrew, not raw English enum values;
- the app must show clearly when the last meaningful action happened in the reporting project/app;
- every project needs a strong, obvious date/time wall for the last meaningful action;
- project knowledge is not dense/useful enough;
- project coverage appears incomplete, especially around Chief of Staff;
- overall UX must be treated as a primary product problem, not a cosmetic pass;
- end state should feel calm, obvious, information-rich, fast, and pleasant enough for repeated daily use.

Do not optimize for "code complete". Optimize for Ariel opening the app and understanding the portfolio immediately.

## 1. Required preflight

Before implementation:
1. Read:
   - CLAUDE.md / AGENTS.md
   - current Control Tower task/run docs
   - Android source under control-tower-android/
   - Apps Script gateway under google-apps-script/control-tower-gateway/
2. Confirm git status, current branch, origin, and latest remote.
3. Do not merge to main unless this task explicitly requires it.
4. Preserve Drive-first architecture and existing gateway/token security model.
5. Preserve Firebase client plumbing, share intake, deputy, and activity functionality.
6. Use Requirements Integrity Guard:
   user intent -> approved requirement -> implementation evidence -> user-visible outcome.
7. Use circuit breaker:
   one deep review + one remediation pass by default. Do not churn indefinitely.

## 2. Canonical portfolio facts that must be reconciled

The live PROJECT_CONTROL_BOARD currently contains these six top-level project rows:
- P-001 Ariel Life OS
- P-002 Household OS
- P-003 Personal News Radar
- P-004 Tom AI Learning
- P-005 Nutrition App
- P-006 Chief of Staff

Important discrepancy discovered:
- Chief of Staff fixture data currently contains AI Control Tower, Household OS, Nutrition App, Tom AI Learning, News Agent, Chief of Staff.
- That fixture omits Ariel Life OS and includes AI Control Tower instead.
- The live Control Tower board contains Ariel Life OS and does not contain AI Control Tower as a child-project row.

Therefore:
- never silently present the old Chief of Staff fixture as if it were the current portfolio;
- perform a bounded reconciliation of Control Tower board vs OS Project Registry vs Chief of Staff project model;
- document exactly what is missing, stale, duplicated, or intentionally infrastructure-only;
- fix mappings/data presentation so Ariel sees the complete canonical top-level portfolio;
- do not invent new project rows merely to make counts match.

If a Chief of Staff subproject/capability is not a canonical portfolio project, surface it in the appropriate capability/run area rather than pretending it is a project.

## 3. Data semantics — timestamps are mandatory

The current gateway only exposes a generic last_check field derived from Last Control Check.
That is insufficient.

Add and preserve distinct semantics:
- last_meaningful_progress = PROJECT_CONTROL_BOARD column "Last Meaningful Progress"
- last_control_check = PROJECT_CONTROL_BOARD column "Last Control Check"
- expected_cadence = PROJECT_CONTROL_BOARD column "Expected Cadence"
- fetched_at / synced_at = when the mobile client received the live portfolio snapshot

Backwards compatibility:
- keep existing fields if needed so old clients do not break;
- add explicit new fields rather than silently changing meaning.

Do not display a Control Tower check timestamp as if it were actual project activity.
If project activity timestamp is absent, say so clearly.

## 4. The "time wall" requirement

This is a core feature, not metadata decoration.

Every project card and project detail view must prominently show:
- "פעילות אחרונה בפרויקט"
- absolute timestamp in Israel format: DD/MM/YYYY HH:MM
- human relative age when possible: "לפני 42 דקות", "לפני 3 שעות", "לפני יומיים"
- stale/unknown state when the timestamp is missing or older than expected cadence

Examples:
- פעילות אחרונה בפרויקט: 18/09/2026 14:23 · לפני 52 דקות
- אין חותמת פעילות עדכנית
- המידע ישן ביחס לקצב הצפוי

Secondary metadata:
- "בדיקת Control Tower אחרונה" may appear in detail/diagnostics, but must not replace project activity.

Home itself must also show:
- "עודכן לאחרונה" / snapshot sync time
- never force Ariel to infer whether the screen is live or stale.

## 5. Hebrew-first product language

Ariel-facing operational UI must not show raw enums as primary labels.

Translate at presentation layer:
- RED -> אדום / דורש טיפול
- YELLOW / AMBER -> צהוב / במעקב
- GREEN -> ירוק / תקין
- Active -> פעיל
- HIGH -> גבוהה
- MEDIUM -> בינונית
- LOW -> נמוכה
- USER TEST REQUIRED -> מחכה לבדיקה שלך
- Needs Ariel -> צריך אותך
- blocked / waiting / running / failed / done -> Hebrew equivalents appropriate to context

Do not transliterate technical noise into Hebrew. Hide technical internals from primary screens.
English product/project names can remain when they are proper names.

## 6. Visual direction

Restore dark mode, but NOT the original almost-black palette.

Target mood:
- calm control room at dusk;
- charcoal/slate, not black;
- clear hierarchy;
- soft contrast;
- status colors visible without neon;
- compact but breathable.

Suggested starting palette, adjustable after review:
- background ~ #171C24
- navigation ~ #202733
- surface ~ #252D39
- elevated surface ~ #2B3543
- border ~ #3A4656
- primary text ~ #F3F6FA
- muted text ~ #B5BFCC
- blue accent ~ #7BA8E8
- green ~ #55B986
- amber ~ #D7A64A
- red ~ #E06E6E

Accessibility:
- readable outdoors/indoors;
- no dark-on-dark navigation;
- status must never rely only on color;
- touch targets >= 44dp where practical.

## 7. Information architecture

### Home: one-glance control surface
Within 5-10 seconds Ariel should know:
1. How many projects exist.
2. Which projects need him.
3. Which projects are red/stale.
4. What changed most recently.
5. When the data was last updated.

Recommended structure:
A. Header:
   - "מגדל הפיקוח"
   - snapshot "עודכן לאחרונה"
   - compact refresh/retry state if relevant
B. "צריך אותי עכשיו":
   - only actionable Needs Ariel / user-test / blocked RED items
   - each card answers: what, why now, what I need to do
C. "תמונת מצב":
   - red / watch / green counts
   - stale count
D. "הפרויקטים":
   - compact cards for all canonical projects
   - status
   - current milestone/status sentence
   - next action
   - prominent time wall
   - owner action if applicable
E. optional "מה השתנה":
   - only if backed by real current evidence; do not manufacture change history.

### Projects
- all canonical projects;
- obvious ordering: needs Ariel / red / stale first, then remaining;
- easy scanning;
- tap opens useful detail, not a raw dump.

### Project detail
Must answer:
- מה המטרה?
- מה המצב עכשיו?
- מה קרה לאחרונה?
- מתי זה קרה?
- מה הפעולה הבאה?
- מה חוסם?
- האם צריך את אריאל?
- מה רמת הביטחון?
- מתי Control Tower בדק לאחרונה?
- primary link if useful.

### Navigation
Bottom navigation stays simple:
- בית
- פרויקטים
- סגן
- פעילות

Rules:
- clear active state;
- Android Back from secondary screen returns Home before exit;
- explicit Home action where useful but avoid visual duplication;
- no screen should feel like a dead end.

## 8. Relevance and density rules

Primary screens:
- no PROJECT_CONTROL_BOARD technical copy unless needed as a provenance hint;
- no raw SHA/version noise;
- no raw backend enums;
- no paragraphs of implementation text.

Cards:
- 2-5 useful lines max before opening detail;
- prioritize actionable/recent information;
- truncate safely but keep meaning;
- visually separate "הבא" and "צריך אותך".

Diagnostics/Activity:
- technical details can live there.

## 9. Freshness / staleness

Create one deterministic freshness model.
At minimum:
- parse last_meaningful_progress;
- compare with expected_cadence where machine-readable enough;
- if cadence cannot be parsed reliably, use a conservative fallback and label uncertainty;
- do not claim a project is stale merely from missing evidence without explaining it.

Prefer:
fresh / aging / stale / unknown
with Hebrew user labels.

Do not over-engineer natural-language cadence parsing. A small bounded parser + safe fallback is better than pretending certainty.

## 10. Chief of Staff coverage investigation

Perform a dedicated discovery pass:
1. Inspect live Control Tower project list contract.
2. Inspect Chief of Staff fixtures and live adapter mapping.
3. Inspect OS Project Registry references available in repo/docs.
4. Produce a discrepancy table in the run report:
   source | project/capability | canonical role | should appear in Control Tower project list? | action taken
5. Ensure Ariel Life OS is not accidentally omitted because of stale Chief of Staff fixture assumptions.
6. Ensure AI Control Tower is not incorrectly treated as a child project unless canonical portfolio policy explicitly says it should be.
7. Preserve Chief of Staff capabilities/runs separately from project rows.

## 11. Technical implementation requirements

- Update modular Apps Script source AND CombinedCode.gs helper if gateway fields change.
- Keep deployed gateway backward-compatible.
- Add tests for field mapping:
  - last_meaningful_progress
  - last_control_check
  - expected_cadence
- Add Android tests or deterministic unit coverage for:
  - Hebrew status mapping
  - timestamp formatting
  - relative age
  - stale/unknown behavior
  - urgency ordering
  - canonical project count/mapping
- Keep secrets out of Git and logs.
- Do not hardcode GATEWAY_TOKEN.
- google-services.json handling remains per current policy.
- Preserve package id com.ariel.controltower.

## 12. Visual QA

Do a real visual review, not only compilation.

Preferred:
- run on emulator if available;
- capture screenshots of Home, Projects, Project Detail, Activity;
- inspect RTL alignment, truncation, contrast, nav visibility, timestamp prominence.

If emulator is unavailable:
- state it explicitly;
- use the strongest available deterministic substitute;
- do not mark Product GREEN without Ariel physical-device acceptance.

Run one review pass against these questions:
- Can Ariel identify all projects quickly?
- Is the most important information above the fold?
- Is the time wall impossible to miss?
- Is all operational status Hebrew?
- Is anything technical leaking into the main UX?
- Is Chief of Staff coverage reconciled?
- Can Ariel always get Home?
- Is the dark palette pleasant rather than oppressive?

Then one remediation pass.

## 13. Build / artifact

Bump version to 0.6.0 or later.
Run:
- build
- lint
- tests
- secret scan if present

Produce a GitHub Actions APK artifact.
Do not ask Ariel for approvals during implementation unless a true external/manual blocker exists.

## 14. Documentation

At end:
- write docs/claude-runs/2026-09-18_control-tower-deep-ux-recovery_REPORT.md
- update relevant current-state/release docs in repo
- report exact commit SHA
- report exact workflow run id
- report APK artifact id/name
- list any remaining manual deployment step separately and minimize it
- preserve Product Gate as AMBER / USER TEST REQUIRED until real phone acceptance

## 15. Exit bar

Engineering GREEN only if:
- build passes;
- lint/tests pass;
- no secrets leaked;
- new timestamp fields are mapped/tested;
- canonical project coverage discrepancy is documented and corrected in code where appropriate;
- all Ariel-facing status copy on core screens is Hebrew;
- Home/Projects/Detail have strong timestamp UX;
- dark-but-soft visual system applied consistently;
- navigation is unambiguous.

Product remains AMBER until Ariel tests on physical phone and says the app is clear, pleasant, and useful.

The run is not complete if it merely compiles.
