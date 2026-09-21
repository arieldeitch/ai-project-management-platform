# Control Tower — Human Layer v2: No English, No Problem Detail

Date: 2026-09-21
Owner: Control Tower
Approved by Ariel: yes
Canonical repo: arieldeitch/ai-project-management-platform
Canonical branch: control-tower-apk-build

## Direct owner feedback from physical-device test

Ariel does NOT want any English explanatory text anywhere in the app.
Ariel does NOT want project cards to explain what is wrong.

His operating behavior is:
1. The Control Tower tells him that a project needs attention.
2. He goes to GPT / the owning AI project to understand the issue and decide the next run.
3. Therefore detailed problem descriptions, objectives, next-action prose, technical evidence, CI/build/contract details, raw backend copy and English project descriptions have no user value in the Control Tower UI.

The detailed information must still exist behind the scenes for machine consumers:
- Control Tower logic;
- Chief of Staff;
- GPT/Claude;
- project agents;
- evidence/audit;
- APIs/contracts.

## Non-negotiable user-facing rule

The app is a management indicator, not a diagnostic console.

For every project card shown to Ariel, the default visible content should be only:
- Hebrew display name;
- status chip;
- at most one short Hebrew management signal such as:
  - "דורש התייחסות"
  - "מחכה לך"
  - "חסום"
  - "במעקב"
  - "תקין"
  - "לא עודכן לאחרונה"
- optional last-update age if it helps;
- optional one concise action button/entry affordance.

Do NOT show:
- why the project is stuck;
- objective text;
- next-action text;
- raw status reason;
- evidence description;
- English notes;
- English sentence fragments;
- branch / commit / CI / contract / gateway / OS marker text;
- recommendation prose;
- "confirm...", "run...", "provide..." style execution instructions;
- any other diagnostic detail in project cards.

If Ariel wants details, the app's job is to route him to the owning GPT/AI context, not teach him the technical issue in the list.

## Hebrew-only human layer

Perform a complete audit of every user-visible string.

All Ariel-facing content must be Hebrew.

This includes:
- project display names;
- project descriptions;
- status labels;
- headings;
- buttons;
- chips;
- tabs;
- empty states;
- loading states;
- errors;
- activity/version screen;
- system screen;
- details screen;
- dialogs/forms;
- navigation labels.

Canonical/internal names may remain English in the data model and machine contract, but the UI must map them to Hebrew display labels.

For known projects, add/derive Hebrew display labels, e.g.:
- Fitness App Recovery -> אפליקציית הכושר
- Household OS -> מערכת הבית
- Irish Citizenship & Passport -> אזרחות ודרכון אירי
- Chief of Staff -> ראש מטה / מנהל אישי (choose the established Hebrew product label if one already exists)
- Personal News Radar -> רדאר החדשות
- Nutrition App -> אפליקציית התזונה
- Tom AI Learning -> הלמידה של תום
- Ariel Life OS -> מערכת החיים

Do not silently mutate canonical project names in the source-of-truth board if they are used by integrations. Prefer a separate display-name mapping/presentation field.

## Project detail screen

The same principle applies after opening a project.

Default project detail should remain management-level only:
- status;
- whether Ariel is needed;
- freshness;
- simple actions/navigation.

Do not reveal technical paragraphs by default.

If a diagnostics/evidence view remains, it must be explicitly secondary and visually separated (e.g. "מידע למערכת" or "פרטים טכניים"), and the user should never need it for normal operation.

## Machine layer preservation

Do NOT delete or flatten:
- objective;
- next action;
- blocker;
- evidence;
- raw status reason;
- OS alignment evidence;
- build identity;
- activity clocks;
- Needs Ariel;
- source refs.

Keep them in the model/API/contract so GPT/Claude/Chief of Staff can reason from them.

The human UI should render a minimal management projection from that richer truth.

## Screenshot-driven defect to reproduce

In the 0.11.0 physical-device screenshot, project cards visibly contain English details such as:
- "Recovery and revalidation of a previously ..."
- "Confirm the exact existing fitness app/repository..."
- "Control delta..."
- "Run the existing owner/family-device checklist..."
- "Personal bureaucracy/document control..."
- "Provide/obtain the aunt's document map..."

This entire class of text must disappear from the user-facing cards.

## Card density target

A project row/card should fit comfortably in one compact block.

Preferred structure:
[Hebrew project name]     [status chip]
[short Hebrew status signal]
[updated age]             [optional action icon]

Avoid multi-line prose.

## Navigation / action expectation

Where practical, provide a simple user action such as:
- "פתח"
- "בדיקה"
- "לטיפול"

Do not introduce a new external integration unless already supported.
If a direct GPT deep-link is not reliable, opening the project management detail is acceptable. Do not invent a non-working GPT launch flow.

## Verification

1. Run the existing Android/gateway/contract tests.
2. Add a regression test that fails if English explanatory prose appears in primary project cards.
3. Verify all known projects receive a Hebrew display label.
4. Verify project cards never render objective/next_action/blocker/evidence/raw_reason.
5. Verify the detailed fields still exist in the machine contract.
6. Review on emulator 360dp / 393dp / 412dp.
7. Review RTL and font scale 1.3x.
8. Capture screenshots of:
   - עכשיו
   - פרויקטים
   - one project detail
   - system/technical secondary view if retained
9. Do one remediation pass after screenshot review.

## Version + APK

If Android UI changes, bump version appropriately from 0.11.0 / versionCode 12.
Produce a signed release APK through the existing workflow.
It must install over 0.11.0 without uninstall/data loss.

## Reporting

Write:
docs/claude-runs/2026-09-21_control-tower-human-layer-v2_REPORT.md

Ariel-facing final report must be in Hebrew and only say:
- מה השתנה;
- האם כל הטקסטים וההערות באנגלית נעלמו;
- האם כרטיסי הפרויקטים עכשיו רק מסמנים צורך בהתייחסות;
- האם המידע המלא נשמר מאחורי הקלעים;
- הגרסה החדשה;
- קישור/זהות APK;
- פעולה אחת של Ariel.

Product remains USER TEST REQUIRED until Ariel installs and validates the new APK.
