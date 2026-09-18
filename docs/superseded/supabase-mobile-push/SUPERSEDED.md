# Superseded — Supabase mobile push scaffolding (0.3.0)

Kept for historical evidence only. As of the 2026-09-18 Drive-first migration (Control Tower 0.4.0) the
Android client no longer uses Supabase for auth, data, token storage or push. The approved architecture is:

PROJECT_CONTROL_BOARD Google Sheet → Google Apps Script gateway (`google-apps-script/control-tower-gateway/`) → Android
Firebase Cloud Messaging = push transport only.

Nothing in this folder should be deployed. The Supabase project `tbqdpvmlhtlrngoxbouf` referenced here is not
in the connected organisation and is not to be recovered or recreated.
