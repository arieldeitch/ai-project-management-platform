# Control Tower 0.4.0 — one-time deployment steps (Ariel)

Everything below is done once. Total ≈ 25 minutes. No Supabase. No paid services.
Files referenced are in the repo under `google-apps-script/control-tower-gateway/`.

## A. Apps Script gateway (≈ 10 min)

1. Open the sheet **PROJECT_CONTROL_BOARD** (id `1EYeDgSd1yMUz7bPbreDlJX130yCay2BMtT_RyQoi2HA`) with the Google account that owns it.
2. Menu **Extensions → Apps Script**. A bound script project opens.
3. In the editor, gear icon **Project Settings** → tick **"Show appsscript.json manifest file in editor"**.
4. Create these files (the **+** next to *Files*) and paste the repo contents 1:1:
   `Code.gs`, `Config.gs`, `Portfolio.gs`, `Inbox.gs`, `Devices.gs`, `Push.gs`, `Scanner.gs`.
   Replace the content of `appsscript.json` with the repo version. Delete the empty default `Code.gs` if it clashes.
5. **Project Settings → Script properties → Add script property**:
   - `GATEWAY_TOKEN` = a long random string (≥ 32 characters). Make one with any password generator. **Keep it — you need it in step C.**
6. In the editor pick the function **`debugHealth`** and press **Run**. Approve the permission dialog (Sheets + external requests). The log should show `spreadsheet_title`, the tabs, and `resolved_columns`.
   - If `unresolved_columns` lists something important (e.g. `name`, `rag`, `needs_ariel`), add script property `PROJECTS_COLUMN_MAP`, e.g. `{"name":"Project Name","needs_ariel":"Needs Ariel?"}`, and run `debugHealth` again.
7. **Deploy → New deployment → type: Web app**. *Execute as:* **Me**. *Who has access:* **Anyone**. Deploy. Copy the **Web app URL** (ends with `/exec`). **Keep it — step C.**
8. Pick the function **`installScannerTrigger`** → **Run** once. This creates the 15-minute scanner that pushes only on newly RED / Needs-Ariel / USER TEST REQUIRED transitions.

## B. Firebase push credential (≈ 5 min)

The Firebase project for `com.ariel.controltower` already exists.

1. Firebase console → **Project settings → Service accounts → Generate new private key**. A JSON file downloads. Do not put it in the repo.
2. Open the JSON in a text editor, copy **all** of it, and in Apps Script add script property
   `FCM_SERVICE_ACCOUNT_JSON` = *(paste the whole JSON as the value)*.
3. Firebase console → **Project settings → Your apps → Android → download `google-services.json`**.

## C. GitHub build secrets (≈ 3 min)

GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value |
|---|---|
| `CT_GATEWAY_URL` | the Web app URL from A-7 |
| `CT_GATEWAY_TOKEN` | the token from A-5 |
| `GOOGLE_SERVICES_JSON` | the full content of `google-services.json` from B-3 |

Then **Actions → Control Tower APK → Run workflow** (branch `control-tower-apk-build`). The run summary must say
`Firebase configured in build: true` and `Gateway configured in build: true`.
Download artifact **`ControlTower-0.4.0-debug`** → `ControlTower-0.4.0-debug.apk`.

*(Shortcut without secrets: any 0.4.0 build opens on a setup screen where you can paste the URL + token once. Push still needs `GOOGLE_SERVICES_JSON` in the build.)*

## D. Physical-device acceptance (≈ 5 min)

1. Uninstall the 0.3.0 build if present, install `ControlTower-0.4.0-debug.apk`.
2. App opens straight into **עכשיו** (no login). Portfolio cards must show the real projects from the sheet.
3. Android asks for notification permission → allow.
4. Tab **פעילות**: the system card must read `שער מחובר • PROJECT_CONTROL_BOARD • … • FCM מוגדר • סורק פעיל` and `התראות: המכשיר רשום ב-MobileDevices`. Check the sheet: tab **MobileDevices** has one row.
5. Tap **שלח התראת בדיקה** → a notification "בדיקת מגדל הפיקוח" arrives → tapping it opens the app on פעילות.
6. From any app (e.g. Claude) share a text → **דווח למגדל הפיקוח** → send. Check the sheet: tab **MobileInbox** has the row with status `REPORTED`.
7. Tab **סגן**: type a command → שלח לסגן → it appears in the history and in MobileInbox.

If all seven pass, report back "0.4.0 accepted" and the product moves from 🧪 מחכה לאריאל to GREEN.

## If something fails

- *"השער החזיר דף במקום JSON"* → the deployment is not a Web app with access **Anyone**, or the URL is not the `/exec` one.
- *"השער דחה את הטוקן"* → `GATEWAY_TOKEN` in Script properties ≠ the value in the build/setup screen.
- *"FCM_SERVICE_ACCOUNT_JSON עדיין לא הוגדר"* → step B-2 missing or pasted partially.
- Portfolio empty → run `debugHealth`, fix `PROJECTS_COLUMN_MAP` (step A-6).
- To rotate the token: change `GATEWAY_TOKEN` in Script properties, update `CT_GATEWAY_TOKEN`, rebuild, reinstall.
