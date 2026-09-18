# Control Tower Android 0.5.0 — UX Recovery Report

Date: 2026-09-18
Branch: control-tower-apk-build
Build commit: 26b8e79dfa2bd0859247bcd77e7d54674284e8ab
GitHub Actions run: 35344211763
Artifact: ControlTower-0.5.0-debug
Build result: SUCCESS
Lint result: SUCCESS

## User evidence that triggered this run
Real-device feedback from Ariel:
- gateway connection works;
- UX does not make portfolio state understandable;
- project status is unclear;
- navigation is too dark;
- relevant information is missing;
- returning to the main portfolio screen is not obvious.

## Implemented
- Switched the app from dark chrome to a calm light theme.
- Renamed the primary navigation destination to explicit "בית".
- Made active navigation visually distinct with high contrast.
- Added an explicit "חזרה לבית" button on every secondary section.
- Android Back now returns Home from secondary tabs.
- Rebuilt Home as a portfolio dashboard.
- Portfolio summary now shows active project count, urgent count, and RAG counts first.
- RED / Needs Ariel / USER TEST REQUIRED projects are shown before normal projects.
- Project cards now show project name, human-readable RAG, milestone/state, next action, and Ariel action when applicable.
- Removed technical copy that competed with operational information.
- Preserved Drive-first gateway, Firebase client config, share/deputy/activity flows.

## Live data grounding
PROJECT_CONTROL_BOARD currently contains six active projects with usable lifecycle/RAG/milestone/next-action fields.
The new Home uses those fields directly instead of showing the three most recently updated rows.

## Gates
Engineering: GREEN — build and lint succeeded.
Product: AMBER — requires Ariel physical-device acceptance of clarity/navigation.
