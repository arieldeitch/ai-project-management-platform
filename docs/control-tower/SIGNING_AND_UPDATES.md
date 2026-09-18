# Signing and install-over updates

**Since 0.7.0 every CI build produces `ControlTower-<version>-release.apk` signed with one persistent key.**
Installing a newer release over an older release keeps the app's data (token, cache, notification state). No uninstall.

## The key (public facts only)

| | |
|---|---|
| Alias | `controltower` |
| Certificate DN | `CN=Control Tower, OU=Ariel, O=Control Tower, C=IL` |
| Certificate SHA-256 | `00:15:1C:98:6C:8B:E1:E3:CD:82:BC:34:5B:5A:F8:4B:BC:41:CA:2E:95:11:25:F4:7A:07:0E:22:9D:7C:79:50` |
| Valid | 2026-09-18 → 2056-09-10 |
| Signature schemes | v2 + v3 (verified with `apksigner`) |

## Where the secret material lives (never in Git)

- GitHub Actions secrets: `CT_RELEASE_KEYSTORE_B64`, `CT_RELEASE_KEYSTORE_PASSWORD`, `CT_RELEASE_KEY_ALIAS`, `CT_RELEASE_KEY_PASSWORD`
  (set 2026-09-18 via the authenticated `gh` CLI; values were streamed from files and never printed).
- Recovery copy on Ariel's build machine, outside the repository: `%USERPROFILE%\.android\control-tower-signing\`
  (`control-tower-release.jks` + `control-tower-release.env`). Back this folder up somewhere private; if both the
  secrets and this folder are lost, future builds cannot install over existing ones.
- `.gitignore` excludes `*.jks` / `*.keystore`; the CI secret scan fails the build if a keystore or key is ever tracked.

## Upgrade paths

| From | To | Result |
|---|---|---|
| 0.3.0 – 0.6.0 (CI *debug* key, changes every run) | 0.7.0 release | **One uninstall required** — `INSTALL_FAILED_UPDATE_INCOMPATIBLE` (verified on the emulator). This is the last time. |
| 0.7.0 release | any later release | Install over, data kept — verified on the emulator (`firstInstallTime` unchanged, `lastUpdateTime` advanced). |
| debug build (emulator/review) | release | Rejected; use `adb uninstall` first. Debug builds are for review only. |

`versionCode` must increase for every real release (0.7.0 = 8). Same-`versionCode` re-installs are allowed by Android only
with `-r`/downgrade flags and are not a release practice.

## Building a signed release locally

```
CT_RELEASE_KEYSTORE_PATH=<path to .jks>  CT_RELEASE_KEYSTORE_PASSWORD=…  CT_RELEASE_KEY_ALIAS=controltower  CT_RELEASE_KEY_PASSWORD=…
gradle :app:assembleRelease
apksigner verify --print-certs app/build/outputs/apk/release/app-release.apk
```
Without the env vars `assembleRelease` still builds but is unsigned (Android will not install it) — the debug path is unchanged.
