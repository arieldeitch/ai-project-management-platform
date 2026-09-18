# Control Tower Mobile Release Prep — One Pager

**Date:** 2026-09-18  
**Repo:** `arieldeitch/ai-project-management-platform`  
**Branch:** `control-tower-apk-build`

## North Star

Put Control Tower on Ariel's Android phone as a real daily-use app, with a recognizable brand and high-signal push notifications.

## Current traffic lights

- 🟢 Native Android shell exists
- 🟢 Owner login flow exists
- 🟢 Portfolio data screens exist
- 🟢 Share-to-Control-Tower intake exists
- 🟡 APK build path exists but is experimental/debug-oriented
- 🟡 Android branch is diverged from main and must be handled carefully
- 🟡 Backend project identity/access needs re-verification
- 🔴 Push notifications are not implemented
- 🔴 Branded launcher icon/logo is not verified
- 🔴 Release/version naming is inconsistent

## This run WILL do

1. Make a reproducible Control Tower **0.3.0** installable APK candidate.
2. Add FCM-based push capability with owner-scoped token registration and a safe server-side sender path where access permits.
3. Add a simple adaptive Control Tower launcher logo/icon.
4. Verify backend/auth/RLS assumptions rather than shipping against an unverified backend.
5. Produce a precise run report and artifact identity.

## This run WILL NOT do

- broad product redesign;
- new portfolio-management features;
- iOS;
- Play Store publication;
- unrelated web-platform cleanup;
- multi-user expansion;
- unbounded review loops.

## Exit bar

Ariel can sideload a correctly branded APK and use the existing core flows. Push is either:
- 🟢 proven with a real received test notification, or
- 🟡 fully implemented with one explicitly documented external credential/configuration gate.

## Ariel after the run

Preferably nothing. If an external Firebase/Supabase credential or console setup is genuinely required, ask for one bounded action only.
