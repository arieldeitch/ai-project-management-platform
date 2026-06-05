# GitHub Import Checklist
**Purpose:** Step-by-step guide to push the repository to GitHub and verify it is correctly set up for continued development and Lovable handoff.

---

## Pre-Push Verification

Run these locally before creating the remote repository. All must pass.

- [ ] **Working directory is clean**
  ```bash
  cd platform
  git status
  # Expected output: nothing to commit, working tree clean
  ```

- [ ] **TypeScript passes**
  ```bash
  npx tsc --noEmit
  # Expected output: (empty — no errors, no warnings)
  ```

- [ ] **Production build passes**
  ```bash
  npx next build
  # Expected: ✓ Compiled successfully, all 21 routes present
  ```

- [ ] **Correct commit count**
  ```bash
  git log --oneline
  # Expected: 6 commits
  # 9537b53  chore: add LOVABLE_START_HERE.md for Lovable UI handoff
  # 170e7dc  chore: apply portfolio cleanup to seed data
  # bc2db2f  feat: complete MVP phases 3-6 + UI foundation + P1 UX polish
  # 46ac550  Phase 2: Project enrichment
  # 08a8f13  Phase 1C: Portfolio dashboard optimization
  # d87e6ba  Initial commit from Create Next App
  ```

---

## Create the GitHub Repository

- [ ] Go to github.com → New repository
- [ ] **Repository name:** `ai-pm-platform` (or preferred name)
- [ ] **Visibility:** Private (recommended — contains personal portfolio data)
- [ ] **Do NOT** initialize with README, .gitignore, or license (repo already has these)
- [ ] Click **Create repository**
- [ ] Copy the repository URL (HTTPS or SSH)

---

## Push to GitHub

```bash
cd platform
git remote add origin https://github.com/YOUR_USERNAME/ai-pm-platform.git
git branch -M main
git push -u origin main
```

- [ ] `git remote add origin` — no error
- [ ] `git push -u origin main` — succeeds, all 6 commits pushed
- [ ] GitHub repository page shows correct file tree (not empty, not just README)

---

## Verify Repository on GitHub

Check these on the GitHub web UI after push:

- [ ] **Root files visible:** `README.md`, `LOVABLE_START_HERE.md`, `PROJECT_STRUCTURE.md`, `package.json`, `next.config.ts`
- [ ] **`app/` directory present** with `globals.css`, `layout.tsx`, and all route folders
- [ ] **`features/` directory present** with 7 subdirectories (dashboard, projects, tasks, assets, decisions, knowledge, settings)
- [ ] **`store/` directory present** with 7 store files
- [ ] **`data/` directory present** with `db/` and `repositories/` subdirectories
- [ ] **`.next/` is NOT present** (confirmed excluded by `.gitignore`)
- [ ] **`node_modules/` is NOT present** (confirmed excluded by `.gitignore`)
- [ ] **README renders correctly** on the repository homepage

---

## Tag the Release

```bash
git tag -a v1.0.0 -m "v1.0.0 — Full MVP with UI polish and portfolio cleanup"
git push origin v1.0.0
```

- [ ] Tag created locally
- [ ] Tag pushed to GitHub
- [ ] Tag visible under Releases on GitHub

---

## Create GitHub Release (Optional but Recommended)

On GitHub: Releases → Draft a new release → Select tag `v1.0.0`

- [ ] **Title:** `v1.0.0 — AI PM Platform`
- [ ] **Description:** Copy content from `RELEASE_NOTES_v1.md`
- [ ] **Mark as:** Latest release
- [ ] Publish release

---

## Verify App Runs from a Clean Clone

Test that a fresh clone installs and runs correctly:

```bash
# In a new directory:
git clone https://github.com/YOUR_USERNAME/ai-pm-platform.git
cd ai-pm-platform
npm install
npx tsc --noEmit
npm run dev
```

- [ ] `npm install` completes without errors
- [ ] `npx tsc --noEmit` produces no output
- [ ] `npm run dev` starts on `http://localhost:3000`
- [ ] Browser opens — dashboard loads (empty state, no data yet)
- [ ] Settings → Import → imports seed data → 23 projects appear
- [ ] ⌘K opens search palette
- [ ] Create a project → project appears in list → reload → project persists

---

## Branch Strategy (For Ongoing Development)

After the initial push, protect `main` and work on feature branches:

```bash
# For any new work:
git checkout -b feature/your-feature-name

# Before merging back to main:
npx tsc --noEmit     # must pass
npx next build       # must pass

git checkout main
git merge feature/your-feature-name
git push origin main
```

- [ ] Branch protection rule added on GitHub: require status checks before merging to `main` (optional but recommended)

---

## Lovable-Specific Setup

If handing off to Lovable for UI work:

- [ ] Lovable has access to the repository (add as collaborator or make public temporarily)
- [ ] Lovable has read `LOVABLE_START_HERE.md` before touching any file
- [ ] Lovable has read `LOVABLE_REVIEW_CHECKLIST.md` — this is the gate before merging any Lovable output
- [ ] A separate branch is created for Lovable work: `git checkout -b lovable/ui-polish`
- [ ] Lovable works on `lovable/ui-polish` only — never directly on `main`
- [ ] After Lovable work: run full checklist in `LOVABLE_REVIEW_CHECKLIST.md` before merging

---

## Key Files Reference

| File | Location | Purpose |
|---|---|---|
| Start here | `platform/LOVABLE_START_HERE.md` | First read for any new contributor or AI |
| Architecture | `platform/PROJECT_STRUCTURE.md` | Full directory map and data flow |
| App README | `platform/README.md` | Stack, features, build instructions |
| Design system | `DESIGN_SYSTEM.md` (outer dir) | Full token and component reference |
| Lovable instructions | `LOVABLE_INSTRUCTIONS.md` (outer dir) | What Lovable may/must not change |
| Lovable prompt | `LOVABLE_PROMPT.md` (outer dir) | Copy-paste prompt for Lovable |
| Review checklist | `LOVABLE_REVIEW_CHECKLIST.md` (outer dir) | Gate before merging Lovable output |
| Release notes | `RELEASE_NOTES_v1.md` (outer dir) | v1.0.0 feature and limitation record |

---

## Checklist Summary

```
Pre-push:
  [ ] git status — clean
  [ ] npx tsc --noEmit — silent
  [ ] npx next build — 21 routes

GitHub setup:
  [ ] Repo created (private)
  [ ] git remote add origin ...
  [ ] git push -u origin main — 6 commits pushed
  [ ] Files visible on GitHub
  [ ] node_modules and .next absent

Release:
  [ ] git tag v1.0.0 + push
  [ ] GitHub Release created

Smoke test:
  [ ] Fresh clone installs and runs
  [ ] Seed import works
  [ ] Data persists across reload
```
