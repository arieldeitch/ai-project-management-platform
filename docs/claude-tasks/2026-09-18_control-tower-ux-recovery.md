# Control Tower Android — UX Recovery 0.5.0

Date: 2026-09-18
Owner: Control Tower
Status: IN PROGRESS

## North Star
On opening the app, Ariel must understand the portfolio state in under 10 seconds and must always have an obvious path back to Home.

## User evidence
Physical-device feedback from Ariel:
- connection works;
- UX is catastrophic / tool is not understandable;
- project status is unclear;
- navigation is too dark;
- relevant information is missing;
- Ariel cannot reliably get back to the main portfolio-status screen.

## Required outcomes
1. Home becomes a true portfolio dashboard, not a generic recent-items screen.
2. Urgent projects are prioritized by RED / Needs Ariel / USER TEST REQUIRED.
3. Every project card shows: project name, human-readable RAG, milestone/state, next action, and Ariel action when relevant.
4. Navigation becomes light/high-contrast and labels become explicit; Home is named "בית".
5. Every non-home screen has an explicit "חזרה לבית" action.
6. Android Back from any secondary tab returns Home before exiting.
7. Remove technical copy that competes with product information.
8. Preserve Drive-first architecture, gateway behavior, FCM plumbing, share/deputy/activity capabilities.

## Non-goals
- No backend changes.
- No Apps Script schema changes.
- No new authentication model.
- No feature expansion beyond navigation/dashboard clarity.

## Product gate
AMBER until Ariel installs the build and confirms:
- Home is obvious,
- status is understandable,
- he can return Home from every section,
- project cards contain useful current information.
