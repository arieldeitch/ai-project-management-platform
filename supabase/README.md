# Control Tower backend — push setup

Backend project: `tbqdpvmlhtlrngoxbouf` (the ref compiled into the Android client).
Nothing here is applied automatically; this directory is the reviewed source for what must be applied.

## One-time external setup (owner action)

1. **Firebase project** (free tier)
   - Add an Android app with package `com.ariel.controltower`.
   - Download `google-services.json` and store its content as the GitHub Actions secret
     `GOOGLE_SERVICES_JSON` in this repository. The APK workflow writes it to
     `control-tower-android/app/google-services.json` at build time; it is git-ignored.
   - Project settings → Service accounts → *Generate new private key* → keep the JSON file
     **outside** the repo.

2. **Supabase** (project `tbqdpvmlhtlrngoxbouf`)
   ```bash
   supabase link --project-ref tbqdpvmlhtlrngoxbouf
   supabase db push                                   # applies migrations/ in order
   supabase functions deploy control-tower-push       # verify_jwt stays ON (default)
   supabase secrets set \
     FCM_SERVICE_ACCOUNT_JSON="$(cat /path/to/service-account.json)" \
     CONTROL_TOWER_OWNER_EMAIL=arieldeitch@gmail.com \
     CONTROL_TOWER_INTERNAL_SECRET="$(openssl rand -hex 32)"
   ```
   - Authentication → Sign In / Providers → **turn off "Allow new users to sign up"** once the
     owner account exists. The client only checks the email string; owner-only access must be
     enforced server-side.

3. **Optional event pushes** (`20260918120100_control_push_events.sql`): enable `pg_net` and
   create the three Vault secrets named in the file header. Without them the trigger is inert.

## Test path

In the app: פעילות → *שלח התראת בדיקה*. The function only ever sends to the calling owner's own
registered devices. Any other account gets `403`.
