<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


## Control Tower operating invariants — 2026-09-19

### Ariel-facing language
All communication rendered to Ariel must be Hebrew by default. Technical identifiers, repository names, branches, commits, raw logs and evidence may remain in English when needed, but user-facing explanations, requests, actions and status labels must be Hebrew.

### Vibe-coding output
Ariel should not be asked to interpret implementation mechanics. The primary surface must communicate:
1. what is wrong / what changed;
2. why it matters;
3. what needs to happen next;
4. which agent/system should handle it.
CI/test/dogfood/file-level details belong behind expandable evidence/detail views, not in the main action text.

### OS alignment
Control Tower is the portfolio visibility layer for Ariel AI Operating System alignment.
For each managed project/app, derive and expose evidence-backed OS alignment:
CURRENT | VERSION_DRIFT | NEVER_SEEN | ACCESS_FAILED | UNKNOWN,
plus last OS check time, version/change marker seen, evidence reference and human-readable sync action.
Do not infer CURRENT from recent activity alone.

### UI density
Default to compact progressive disclosure: high-level state at a glance; details on explicit open/tap. Preserve a calm, readable mobile-first presentation.
