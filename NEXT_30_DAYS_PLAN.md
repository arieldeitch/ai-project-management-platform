# Next 30 Days Plan — Platform Adoption
**Date:** 2026-06-06  
**Context:** Platform entering real daily use. No new features until adoption feedback from live use.

---

## Operating Principle

The next 30 days are not a development sprint. They are an **adoption sprint**.

Every decision this month has one test: *does this help me use the platform tomorrow morning?*

If the answer is no, it does not belong in the plan.

---

## Week 1 — Data Migration and Baseline

**Goal:** Get real data into the platform. Establish a daily opening ritual.

### Actions

**Day 1: Import your portfolio**
1. Open Settings → "ייבא 27 פרויקטים" — import the seed data (your real Excel projects)
2. Walk through each project. Set: name, status, priority, `next_action` (one sentence only)
3. Archive any projects you haven't thought about in 6+ months without guilt
4. By end of Day 1: every ACTIVE project has a `next_action`. Every BLOCKED project has a `blocked_reason`.

**Days 2–3: Status cleanup**
- The imported projects will mostly be in `draft` or `active` status
- Move anything that is truly running and being used to `active`
- Move anything on hold to `deferred`
- Move anything truly dead to `archived`
- Do not try to advance projects through the governance lifecycle on day 1. That comes later.

**Days 4–5: Link tasks to projects**
- For each active project, create 1–3 tasks: the concrete next actions
- Use the tasks tab inside the project detail page (not the global tasks list)
- Do not create tasks for projects that are deferred or archived

**Days 6–7: First decision log**
- Think of 3 decisions you made in the last month about your work
- Log them in /decisions. Link each to a project.
- These do not need to be formal. "Decided to use IndexedDB instead of SQLite" is a valid decision.

**What you should have after Week 1:**
- 23 real projects with accurate status and priority
- Every active project has: a goal, a next_action, and 1–3 tasks
- 3+ decisions logged
- A clear sense of which sections of the platform you actually open

---

## Week 2 — Daily Ritual Establishment

**Goal:** Build the habit. Find the real friction.

### The Daily Opening Ritual (5 minutes, every morning)

1. **Open /dashboard**
   - Read the Focus card (top project). Is the next_action still accurate?
   - Scan the blocked section. Did any blocker resolve? Update it.
   - Scan "פעולות הבאות". Pick ONE to act on today.

2. **Open that project's detail page**
   - Update next_action to reflect today's specific intent
   - Add or complete a task
   - If you made a decision yesterday: log it in the decisions tab (navigate to decisions, link the project)

3. **Close the app**
   The platform is not a workspace. It is a tracker. Don't leave it open all day.

### What to track (in a plain note, not in the platform)

Every day this week, note:
- Which screens you visited
- What took more than 2 clicks that shouldn't have
- Any data you wanted to enter that the platform made awkward

This raw friction log is the most valuable output of Week 2.

---

## Week 3 — Knowledge and Decisions

**Goal:** Build the habit of capturing knowledge and decisions before they evaporate.

### Actions

**Decisions:** After any meeting, any conversation with Zvika, any design decision — log it within the same day. Even one sentence. The platform's value compounds as decisions accumulate.

**Knowledge items:** For each active project, create at least one knowledge item. Start with the type `תהליך` (process) and describe how you currently work on that project. One paragraph is enough.

**Do not use doc_role yet.** The doc_role system (GPT spec, handoff document, etc.) is for governance. In Week 3, you are building the habit of capturing, not the habit of classifying. Add doc_role when it becomes natural, not as a requirement.

**The test for Week 3:** At the end of the week, open /knowledge and see if the list tells you something useful about your work. If it does, the habit is working.

---

## Week 4 — Workflow Governance (Selective)

**Goal:** Use the governance system for the 2–3 projects where it applies. Ignore it for the rest.

The governance lifecycle (draft → scoped → gpt_setup → active) was built for **AI software projects**. It does not apply to:
- India operations management
- Family non-software projects  
- Research and learning projects
- Personal organizational projects

### For AI/Software projects only:

Pick the ONE project you are actively developing.

Walk it through the lifecycle deliberately:
1. Fill the 9 draft fields (idea, goal, target_audience, etc.)
2. Advance to `scoped`
3. Generate the GPT spec from the Workflow panel
4. Fill in the GPT spec in the knowledge section
5. Set `assigned_gpt`, `gpt_role`, mark `knowledge_uploaded`
6. Advance to `ready_for_development`

This is the governance engine working as intended. It takes 30–45 minutes for one project and surfaces missing information. Do this for the AI Platform project itself first.

**For all other projects:** Leave them in `draft` or `active`. Do not force them through the software lifecycle. The governance badge showing "N שדות חסרים" can be safely ignored for non-software projects.

---

## Top 5 Improvements by Impact

These are ranked by daily-use impact, not implementation complexity. They should not be built until after 30 days of real use confirms their priority.

### 1. Inline Decision and Knowledge Creation from Project Context
**Impact: Critical**

The current flow: project detail → navigate to /decisions/new → select project from dropdown → fill fields → save → navigate back.

The needed flow: project detail → "+ החלטה" button in decisions tab → inline form → save in place.

This is the most common daily action that currently requires the most navigation. Until it's fixed, the platform will feel like a filing cabinet — you can retrieve information, but adding it is laborious.

### 2. Staleness Indicator on Projects
**Impact: High**

Every project card and dashboard row should show "עודכן לפני X ימים" — derived from `updated_at`. Projects not touched in 30+ days should show a subtle amber indicator.

Without this, stale projects are invisible. A solo founder managing 23 projects needs to immediately see which ones have gone cold.

### 3. Project Category Field (Software / Operations / Personal / Research)
**Impact: High**

Adding a single `project_category` enum to the Project entity would allow the governance engine to selectively apply lifecycle requirements only where they make sense. Operations and personal projects would get a simplified lifecycle (active/completed/deferred). Software and AI projects keep the full 8-stage lifecycle.

This fixes the core governance mismatch without removing any existing functionality.

### 4. Keyboard Navigation in ⌘K Search Results
**Impact: Medium**

Arrow keys + Enter to navigate and open results. Escape already works to close. The missing piece is directional key handling inside the results list.

This is a 2–3 hour implementation. For a power user doing 10+ searches per day, it reduces friction on every single search.

### 5. "Today's One Thing" on Dashboard
**Impact: Medium**

The dashboard currently shows 6 next actions and lets the user decide. The improvement: auto-select the highest-priority active project with an unfilled next_action and present it as a single prominent card at the top: *"Today: [project name] — [next_action]"*.

The decision logic is simple: top active project by priority that was not updated today. The visual treatment is a single prominent call-to-action above all other sections.

---

## What to Explicitly NOT Do in the Next 30 Days

- **Do not add new governance phases.** The engine is complete. Let it prove its value before extending it.
- **Do not refactor the Kanban.** The 12-column board has a known design problem (too wide for mixed portfolios). Document the problem; do not fix it until you have observed how you actually use the Kanban in practice.
- **Do not add dark mode.** Not a daily-use blocker. Not worth the effort for a solo tool.
- **Do not add more project fields.** The current 27 fields are already more than you will fill. The problem is filling, not having.
- **Do not add CSV import.** The JSON import from Settings works. The Excel data is already seeded. Do not build infrastructure to import from a source you are replacing.
- **Do not add external integrations** (GitHub API, Slack notifications, email). Local-first is a feature, not a limitation. Integrations add complexity without adding clarity.
- **Do not redesign the Kanban into a different view type** (timeline, calendar, etc.). Wait for evidence of what view you actually need.

---

## What the User Should Do This Week Inside the Platform

> This is the specific, concrete answer to "what do I do Monday morning?"

**Monday:**
Import the portfolio via Settings. Spend 20 minutes setting accurate status (active/deferred/archived) for every project. Do not fill draft fields. Just get the statuses right.

**Tuesday:**
Open each ACTIVE project. Write one sentence in `next_action` that is true today. If you don't know the next action, the project status might be wrong.

**Wednesday:**
Create 3–5 tasks for your most important active project. Use the Tasks tab inside the project detail page. Make each task specific enough to be "done" in one work session.

**Thursday:**
Log 3 decisions you've already made (past decisions are fine). Link each to its project. Use whatever wording is natural — no required format.

**Friday:**
Open the dashboard. Does it reflect reality? Does the Focus card show the project you actually care about most? Is the blocked list accurate? Spend 10 minutes making the dashboard truthful. That feedback loop — the dashboard as a mirror of your actual portfolio — is the platform's primary value proposition.

**By end of week:** You should be opening the platform every morning and closing it within 5 minutes. If that's not happening, the friction is real — note it and prioritize fixing it next month.

---

## Success Criteria for 30 Days

The platform has succeeded if, after 30 days:

1. You open it every workday morning
2. Every active project has an up-to-date `next_action`
3. You have logged at least 10 decisions (decisions compound in value over time)
4. You have at least 5 knowledge items that you have actually referenced
5. You can answer "what am I working on this week" in under 30 seconds by looking at the dashboard
6. You have identified at least 2 concrete friction points to fix — friction identified through real use is more valuable than features imagined in planning

---

## Is the Platform Ready to Be the Primary AI Project Operating System?

**Yes, with one condition.**

It is ready to be the primary tracker. It is ready to replace Excel for portfolio status. It is ready to store decisions and knowledge.

It is not yet the primary **operating** system — the tool you open before you start work and the tool that tells you what to do next — because the daily capture friction is too high and the "what should I do today" synthesis is not yet there.

That gap closes with Improvement #1 (inline creation) and Improvement #5 (today's one thing). Both are 1–2 day implementations. Build them in Week 5, after 4 weeks of real use confirm they are the right priorities.

**Start using it now. Build only what real use proves is missing.**
