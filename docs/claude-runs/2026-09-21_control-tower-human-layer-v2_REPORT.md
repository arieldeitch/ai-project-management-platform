# Run report — Human Layer v2: no English, no problem detail on cards (2026-09-21)

**Task:** `docs/claude-tasks/2026-09-21_control-tower-human-layer-v2.md` · **Executor:** Claude Code (Opus 5), autonomous EXECUTION run
**Branch:** `control-tower-apk-build` · **START_HEAD:** `93bae27` · **END_HEAD:** the docs commit containing this report (code commit `885f0da`)

## Status in one line
Control Tower 0.12.0 shows each project as a management indicator only — Hebrew display name, status chip, at most one
short signal, update age, "פתח" — and the entire class of text from Ariel's screenshot ("Recovery and revalidation…",
"Confirm the exact existing…", "Control delta…", "Run the existing owner/family-device checklist…", "Personal
bureaucracy…", "Provide/obtain…") can no longer reach a card (regression test). Every field is preserved verbatim in the
gateway contract, in `Project.raw`, and behind the closed "מידע למערכת" section. Product gate: **USER TEST REQUIRED**.

## Reproduction (before) → fix (after)
- `docs/claude-runs/screenshots/2026-09-21_control-tower-0.12/00_before_0.11.0_now.png`: 0.11.0 against a fixture that carries the photographed rows (Fitness App Recovery, Irish Citizenship & Passport with English objective / next_action / ariel_input / blocker) — the prose appears on the cards exactly as on the phone.
- `01_now_412.png` / `02_projects_412.png` (0.12.0, same fixture): cards read אפליקציית הכושר · צריך אותך · עודכן לפני יומיים · פתח — nothing else.
- `03_detail_412.png`: detail = chip + "מחכה לך" + status meaning + "הפרטים אצל ה-GPT / הסוכן של הפרויקט" + age.
- `04_detail_machine_412.png`: "מידע למערכת" opened — short_description, objective, milestone, next_action, ariel_input, blocker, risk, progress_evidence and the technical lines, all verbatim.
- `05_deputy_412.png`, `06_system_412.png`, `07_now_360_font130.png`, `08_projects_360_font130.png`, `09_now_393.png`: 360 / 393 / 412 dp and font scale 1.3.

## What changed (user-facing)
| Surface | 0.11.0 | 0.12.0 |
|---|---|---|
| Project card | canonical English name, short description (often English), one "human line" built from `ariel_input` / `blocker` / `risk` / `next_action` (board prose, often English), age, chips | **Hebrew display name · status chip · at most one signal (לא עודכן לאחרונה / לא מסונכרן) · עודכן לפני … · פתח ›**. No description, no reason, no next action, no prose of any kind |
| Detail (top) | "מה צריך ממך: <ariel_input prose>", "הבא: <next_action prose>", OS sentence, collapsibles "עוד פרטים" (objective, evidence…), "סנכרון…", "פרטים טכניים" | chip(s) · one management line (מחכה לך / חסום / דורש התייחסות / במעקב / תקין) · status meaning · "הפרטים אצל ה-GPT / הסוכן של הפרויקט" (when Ariel is needed) · OS sentence when actionable · age · "פתח את הפרויקט" (link) |
| Detail (secondary) | three collapsibles, "עוד פרטים" showed board prose by default when opened | **one** closed section "מידע למערכת" with the note "לא נדרש לשימוש רגיל — מיועד ל-GPT, ל-Claude ולצ'יף", then every board field labelled by its machine key and the technical lines (LTR) |
| Project names | canonical English everywhere | Hebrew: אפליקציית הכושר · מערכת הבית · אזרחות ודרכון אירי · הצ'יף (the label Chief of Staff already uses) · רדאר החדשות · אפליקציית התזונה · הלמידה של תום · מערכת החיים · מגדל הפיקוח; unknown projects: board `display_name` → Hebrew description → canonical (never invented) |
| סגן headlines | "דיווח על Chief of Staff: weekly digest published…" quoted agent prose | "התקבל דיווח מצ'יף" / "התקבל עדכון ממערכת הבית"; the prose stays under "ראיות" |
| מערכת alerts | canonical project key | Hebrew display name; push-event labels strict Hebrew (unknown kinds → "התראה") |
| Signals | "מחכה לך" also as a line under a "צריך אותך" chip (review finding) | never repeated: the chip is the status; the line exists only for לא עודכן לאחרונה / לא מסונכרן |

## Full string audit
- Cards: `ProjectCard` is the only projection a card may render; it is built from status, freshness, OS state and the display name — board prose is not an input. `HumanLayerV2Test.screenshotDefectCannotRecur…` builds the photographed rows and fails on any Latin letter, any of the six photographed fragments, or any technical vocabulary in any card field.
- Labels / statuses / OS states / errors / empty & loading states / tabs / buttons / chips: asserted Hebrew and human-layer (`HumanLayerTest`, unchanged, still green).
- Remaining Latin on primary surfaces, by design: canonical project names only when no Hebrew name exists (none in the current board), Ariel's own idea titles and commands, the owner chip "Claude" in סגן, and the setup screen's URL field (one-time, data not copy).

## Machine layer preservation (verified)
- Gateway contract unchanged except one **additive** optional field `display_name` (0.10.1 / contract 5). `objective`, `next_action`, `blocker`, `ariel_input`, `risk`, `progress_evidence`, `status_reason`, OS fields, clocks, `needs_ariel`, evidence refs: all still emitted and still parsed; `Project.raw` is the untouched row; `boardProse()` + `technicalLines()` re-emit them for "מידע למערכת". Test `machineLayerKeepsEveryFieldTheCardHides` asserts each hidden field against the original text.
- Chief of Staff reads the gateway directly; its suite (234) was green on the unchanged contract last run and nothing it consumes changed.
- Canonical names are not mutated anywhere: `Project.name` stays the integration key; `display_name` is presentation only (gateway test: "שם תצוגה" column maps to `display_name`, `name` untouched; absent column → empty string, reported as an unresolved optional column in `health`).

## Tests & gates
| gate | result |
|---|---|
| Android unit tests | **62 / 62** (`HumanLayerV2Test` 9 new: screenshot regression, card fields, display names for every known project, resolution order, gateway `display_name`, machine layer intact, deputy headlines, push events, OS chips) |
| Android lint | 0 errors |
| Gateway tests | **41 / 41** (1 new) · CombinedCode in sync (`build-combined.mjs --check`) |
| Secret scan | clean |
| Emulator review | 412 / 393 / 360 dp, font 1.3×, RTL — 10 screenshots; one remediation pass (redundant "מחכה לך" line under the "צריך אותך" chip removed; `detailLine()` now carries it on the detail screen only) |
| APK CI | run **35582790209** ✅ on `885f0da` |

## Artifact
| field | value |
|---|---|
| versionName / versionCode | **0.12.0 / 13** |
| commit | `885f0da` |
| workflow run | 35582790209 (`Control Tower APK`, branch `control-tower-apk-build`) |
| artifact | **`ControlTower-0.12.0-release`** id **10631415217** (`ControlTower-0.12.0-release.apk`, 1,951,932 bytes) |
| SHA-256 | `a5e3422085089c430eb3c3fa3fe34ebaf58848a77025b9d207e803e5658acc7c` |
| signer | persistent key, cert SHA-256 `00151c98…7c7950` (verified with apksigner on the downloaded file) |
| update-over | verified on the emulator with the **signed** builds: 0.11.0 release installed → 0.12.0 release `adb install -r` → Success, versionCode 13 (same signer, app data kept) |
| Ariel must install | **yes** |

## Gateway note
0.10.1 is additive; the live 0.10.0 / contract 5 deployment keeps working with the new app (display names come from
the in-app mapping). Redeploying 0.10.1 is optional and only needed if Ariel wants to override a Hebrew name from a
"שם תצוגה" column on the board.

## Invariants
No auth/secrets/sharing changes · contract additive only · no board cell edited · no force-push · concurrent commit (`93bae27`) pulled before work.
