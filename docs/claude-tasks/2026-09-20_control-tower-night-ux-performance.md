# Night Run — Control Tower Hebrew Compact UX + Responsiveness + Navigation Clarity

Date: 2026-09-20
Owner: Control Tower
Approved by Ariel: yes
Canonical repo: arieldeitch/ai-project-management-platform
Canonical branch: control-tower-apk-build
Starting point when authored: 8ee32d2488e88c1fd5286d8168901d36a6f8675e

## Why this run exists

Ariel tested Control Tower 0.10.0 on the phone after the live gateway was upgraded to gateway 0.10.0 / contract 5.

The engineering path works, but the product still violates the intended human layer:
- project state is not compact enough;
- too much technical detail reaches Ariel in English;
- some buttons wrap/cut text;
- taps/navigation feel slow;
- the distinction between "בית" and "פרויקטים" is unclear.

This is a product-quality night run, not a narrow patch.

## North Star

Control Tower must feel like a calm Hebrew management console, not a developer dashboard.

Ariel should be able to open the app and immediately understand:
- which projects are fine;
- which need attention;
- which are blocked;
- which need something from him;
- where to tap next.

Ariel should NOT have to understand implementation details, CI vocabulary, evidence payloads, branch names, raw OS receipt fields, technical English, or diagnostic strings in order to know what to do.

Machine/agent consumers must still retain access to the detailed structured data behind the scenes.

## Hard product invariant — human layer vs machine layer

### Human layer shown to Ariel
Default visible project state must be concise Hebrew management language.

Examples:
- תקין
- דורש טיפול
- חסום
- צריך אותך
- ממתין
- לא מסונכרן
- לא עודכן לאחרונה

If action is required, say only what Ariel needs to know at management level:
- "האפליקציה תקועה — נדרשת ריצת תיקון ב-GPT/Claude."
- "הפרויקט מחכה לבדיקה שלך."
- "הפרויקט לא מסונכרן למערכת ההפעלה."
- "לא התקבל עדכון מהפרויקט."

Do not expose a technical explanation by default.

### Machine/agent layer
Do NOT delete the detailed evidence or downgrade the integration contract.

Keep structured details available for:
- Control Tower logic;
- Chief of Staff;
- GPT/Claude execution handoff;
- diagnostics/evidence screens;
- run reports;
- APIs/contracts.

The UI may expose a deliberate secondary "פרטים טכניים" / evidence path if needed, but it must not contaminate the default management view.

## Mandatory workstreams

### 1. Compact Hebrew project state everywhere

Audit Home, Projects, Project Detail, Deputy/Activity and any other project-status surface.

For every project row/card:
- project name;
- optional one-line short purpose;
- one clear status;
- one concise human reason only if useful;
- one next action only when action exists;
- freshness/activity only if it improves the decision.

Remove technical noise from the default view:
- raw contract/gateway language;
- branch/SHA/build internals;
- OS raw enum names;
- evidence payloads;
- CI/test jargon;
- English technical sentences.

Do not remove the underlying data model.

Apply progressive disclosure:
summary first -> management detail -> technical evidence only on explicit request.

### 2. Rewrite every Ariel-facing string to natural Hebrew

Perform a full string audit of the Android app.

Requirements:
- Hebrew-first and natural, not translated developer terminology.
- No English explanatory copy in primary UI.
- English may remain for canonical product/project names and technical identifiers only where needed.
- Status names, actions, errors, empty states, loading states and buttons must all be clear to a non-developer.

Any raw backend error shown to Ariel must be mapped to a short Hebrew user-level message.
Preserve raw error/evidence for logs or expandable diagnostics.

### 3. Button and chip text must never be cut or wrap awkwardly

Ariel observed buttons whose text is truncated or drops to a second line.

Audit every tappable control:
- bottom navigation;
- top actions;
- filter chips;
- project actions;
- idea actions;
- deputy/activity actions;
- dialogs/forms;
- expandable sections.

Acceptance:
- no primary button label is clipped;
- no navigation label falls to an unintended second line;
- no chip becomes unreadable;
- layout remains usable at common phone widths, at least 360dp / 393dp / 412dp;
- test Hebrew RTL;
- test Android font scaling at least default and one enlarged setting;
- if text does not fit, redesign the control: shorter Hebrew label, icon+accessible label, responsive layout, or different grouping. Do not solve by tiny text.

Add deterministic UI/layout tests where practical and capture screenshots.

### 4. Responsiveness — taps must feel immediate

Ariel reports the app still takes too long to respond to presses.

Treat this as a first-class performance problem.

Profile before guessing:
- navigation transitions;
- tab switching;
- expanding/collapsing detail;
- filters;
- opening project detail;
- ideas reorder;
- refresh/sync;
- any click that triggers network I/O.

Rules:
- local UI feedback/navigation must never wait for a network round-trip when not strictly necessary;
- show immediate visual response to tap;
- render cached/local state immediately, refresh in background;
- optimistic updates where safe;
- avoid full-screen blocking reloads for routine interactions;
- avoid repeated fetches caused by navigation;
- preserve scroll/filter state where appropriate;
- remove main-thread work that blocks click handling.

Instrument enough to prove improvement.
Target product behavior: visible local response should normally begin essentially immediately (aim <100–150 ms for local-only interactions on the emulator/test device); network completion may happen later in the background.

Do not hide latency with fake success. If an operation truly requires confirmation, show immediate pending state and complete asynchronously.

### 5. Clarify "בית" vs "פרויקטים"

Ariel currently cannot understand the difference.

Do not merely add explanatory text.

First inspect the actual information architecture and user journeys.

Then make the distinction self-evident or remove the duplication.

Preferred decision rule:
- if Home is the management summary / "what needs my attention now", name/design it accordingly in Hebrew;
- Projects is the full portfolio browse/manage surface;
- if both surfaces remain too similar after that distinction, merge/simplify them rather than preserve two confusing tabs.

The app should make the difference obvious from content and behavior, not from a paragraph explaining it.

Test with:
- app launch;
- "what needs me now?";
- "show me all projects";
- "open one project";
- return/back behavior.

Document the final IA decision and rationale in the run report.

### 6. Full product audit, not only the reported defects

Walk every major screen and interaction on the current 0.10.0 product:
- Home/current landing screen;
- Projects;
- Project Detail;
- Ideas;
- Deputy;
- Activity/version;
- settings/config if present;
- refresh;
- filters;
- links;
- back navigation;
- empty/error/loading states;
- RTL;
- offline/degraded gateway behavior if supported.

Look for:
- duplication;
- clutter;
- ambiguous labels;
- unnecessary technical content;
- slow interactions;
- inconsistent hierarchy;
- broken text layout;
- stale data presentation;
- accidental English;
- dead/low-value controls;
- confusing navigation.

Fix issues that clearly violate the established product direction without asking Ariel routine questions.

### 7. Preserve and verify Control Tower ↔ Chief of Staff / machine data contract

The UI simplification must not break downstream consumers.

Keep detailed structured data available behind the scenes:
- status_bucket + rationale/evidence;
- OS alignment state/evidence;
- activity clocks;
- Needs Ariel;
- build/version identity where used;
- raw evidence references;
- next action / owner.

Verify Chief of Staff still receives the structured truth it needs even if Control Tower shows a much shorter Hebrew summary to Ariel.

Do not create a competing registry.

### 8. Update the deployed-state documentation

The gateway is now actually deployed and verified:
- gateway_version = 0.10.0
- contract_version = 5
- OS_CURRENT_VERSION = 1.1.0
- OS_CURRENT_CHANGE_MARKER = OS-2026-09-19-01

Update stale release/runbook/status documentation so it no longer claims live gateway 0.9.0 / contract 4.

### 9. Version + APK

This run changes user-facing Android behavior, so inspect the current version and bump appropriately; do not guess before reading the actual repo.

Produce a new signed release APK with the persistent signing key through the existing GitHub Actions path.

It must install over Control Tower 0.10.0 without data loss.

Report:
- versionName;
- versionCode;
- commit SHA;
- workflow run;
- artifact name/id;
- APK SHA-256;
- whether Ariel needs to install it (expected yes if Android changed).

## Verification

Run all existing quality gates plus new targeted tests.

At minimum verify:
- gateway tests;
- Android unit tests;
- lint;
- secret scan;
- CombinedCode sync if gateway touched;
- Hebrew primary strings;
- status summary mapping;
- no raw technical error in primary user layer;
- Home/Projects IA behavior;
- button/chip label layout;
- responsive phone widths;
- font scaling;
- interaction latency / no network-blocked navigation;
- optimistic/background sync paths;
- Chief of Staff contract compatibility.

Use emulator screenshots for all major screens after the remediation pass.
Do a focused visual review and one meaningful remediation pass.

## Autonomy

This is approved as an overnight autonomous run.

Do not stop after discovery, planning or first fix.
Do not ask Ariel routine implementation questions.
Continue through implementation, testing, screenshots, docs, push and APK build.

If a genuine external blocker exists:
- complete all unblocked work;
- keep the repo clean and pushed;
- leave one short Hebrew Ariel action at the end.

Do not change authentication, secrets, sharing, ownership, OAuth, RLS or approval model merely to make the work easier.

## Repo safety

Before editing:
- git fetch --all --prune
- verify branch and remote
- verify worktree state
- pull --ff-only
- read AGENTS.md and project task/run docs
- record START_HEAD

Do not assume this task file's starting SHA is still HEAD.
Do not overwrite concurrent work.

## Durable reporting

Write the completion report to:
docs/claude-runs/2026-09-20_control-tower-night-ux-performance_REPORT.md

Include:
- START_HEAD / END_HEAD;
- exact user-facing changes;
- final Home vs Projects IA;
- performance root causes found;
- latency measurements before/after where measurable;
- screenshots;
- tests;
- workflow/build artifact;
- any downstream contract validation;
- exact remaining Ariel action.

## Ariel-facing final report format

Reply to Ariel in Hebrew only.

Keep the first section short:
1. מה השתפר;
2. האם האפליקציה מרגישה מהירה יותר;
3. מה ההבדל הסופי בין מסך הבית לפרויקטים (או אם אוחדו);
4. האם המידע הטכני הוסר מהתצוגה הראשית אך נשמר מאחורי הקלעים;
5. האם יש APK חדש;
6. הפעולה היחידה של אריאל עכשיו.

Technical appendix may follow, but never make Ariel parse it to know what to do.

## Exit bar

Do not declare the run complete until:
- default project views are compact and Hebrew;
- technical detail is removed from Ariel's primary layer but retained for agents/evidence;
- button/chip text layout is robust;
- navigation intent is clear;
- interaction latency has been investigated and materially improved where the code allowed;
- all major screens were audited;
- downstream structured data remains intact;
- stale deployment docs are corrected;
- tests are green;
- work is committed/pushed;
- new signed APK is produced if Android changed;
- run report is committed.

Product remains USER TEST REQUIRED until Ariel validates the new APK on his phone.
