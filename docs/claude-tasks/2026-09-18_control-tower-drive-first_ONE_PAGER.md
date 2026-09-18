# Control Tower Drive-First Migration — One Pager

**Date:** 2026-09-18
**Repo:** `arieldeitch/ai-project-management-platform`
**Branch:** `control-tower-apk-build`
**Task:** `docs/claude-tasks/2026-09-18_control-tower-drive-first.md`

## North Star
A private Android Control Tower app that reads the real portfolio from Google Drive/Sheets, accepts external reports, and receives high-signal push notifications — with no separate paid database.

## Approved architecture
**PROJECT_CONTROL_BOARD Sheet → Apps Script gateway → Android**
**Firebase FCM = push transport only**
**Supabase = removed from mobile runtime**

## Current state
🟢 Native Android shell and 0.3.0 CI build exist.
🟢 Launcher branding and FCM client scaffolding exist.
🟢 Firebase Android app registration exists for `com.ariel.controltower`.
🟢 Google Drive / PROJECT_CONTROL_BOARD is the canonical portfolio source.
🟡 Push client is implemented but not end-to-end verified.
🔴 Current Android data/auth path still depends on inaccessible legacy Supabase.
🔴 Apps Script gateway does not yet exist.

## Run scope
1. Build repo-local Apps Script gateway.
2. Read canonical Projects/Connections from existing Control Board.
3. Add MobileInbox / MobileDevices (+ dedupe state if needed).
4. Migrate Android data/share/token flows off Supabase.
5. Use Apps Script as FCM sender.
6. Build v0.4.0 in CI.
7. Produce minimal deployment handoff.

## Non-goals
- no new Supabase project
- no public multi-user product
- no broad UI redesign
- no unrelated web-platform refactor
- no new paid infrastructure
- no portfolio data duplication

## Product gate
Not GREEN until Ariel installs the build and proves:
1. portfolio loads from Drive;
2. share report reaches MobileInbox;
3. notification permission works;
4. test push arrives;
5. push tap opens Control Tower.

## Ariel action after this run
Ideally one bounded deployment/configuration sequence only, then:
**🧪 מחכה לאריאל — USER TEST REQUIRED**
