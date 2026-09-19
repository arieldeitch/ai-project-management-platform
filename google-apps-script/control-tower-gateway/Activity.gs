/**
 * Live project activity pipeline — append-only evidence of real execution.
 *
 *   ActivitySources → (explicit heartbeat | GitHub | Drive observation) → ActivityLedger
 *   → effective project activity per project → portfolio contract (last_meaningful_progress)
 *
 * PROJECT_CONTROL_BOARD stays the canonical status/milestone/next-action truth. This layer never
 * overwrites curated status; it only decides WHEN the project last really moved and from which evidence.
 *
 * Source priority (highest first): explicit heartbeat › structured run report › GitHub › Drive ›
 * curated Projects.Last Meaningful Progress. Last Control Check is never project activity.
 */

var ACTIVITY_DEDUPE_WINDOW = 1200;   // ledger rows scanned for dedupe
var ACTIVITY_LATEST_WINDOW = 2500;   // ledger rows scanned for "latest per project"
var ACTIVITY_SCAN_STATE_KEY = 'ACTIVITY_SCAN_STATE';
var ACTIVITY_GITHUB_ETAG_PREFIX = 'GH_ETAG:';
var HEARTBEAT_DOMINANCE_MS = 15 * 60 * 1000; // an explicit heartbeat outranks inferred activity in the same work window
var ACTIVITY_TYPES = ['progress', 'checkpoint', 'automation', 'report', 'control_check'];
var EVIDENCE_LEVELS = ['REPORTED', 'OBSERVED', 'VERIFIED', 'CURATED'];

// ---------- sources ----------

function readActivitySources_() {
  var sheet = ensureSheet_(ACTIVITY_SOURCES_SHEET, ACTIVITY_SOURCE_HEADERS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, ACTIVITY_SOURCE_HEADERS.length).getValues();
  var out = [];
  values.forEach(function (row, i) {
    var projectId = str_(row[0], 80).trim();
    var locator = str_(row[3], 300).trim();
    if (!projectId || !locator) return;
    out.push({
      row: i + 2,
      project_id: projectId,
      project_name: str_(row[1], 160).trim(),
      source_type: str_(row[2], 40).trim(),
      locator: locator,
      branch: str_(row[4], 120).trim() || 'main',
      include_automation: truthy_(row[5]),
      enabled: row[6] === '' ? true : truthy_(row[6]),
      last_poll_at: cellIso_(row[7]),
      last_seen_at: cellIso_(row[8]),
      notes: str_(row[9], 400)
    });
  });
  return out;
}

/** project_id → true when any enabled source for that project includes automation as activity. */
function automationPolicyByProject_(sources) {
  var out = {};
  (sources || readActivitySources_()).forEach(function (s) {
    if (s.enabled && s.include_automation) out[s.project_id] = true;
  });
  return out;
}

// ---------- ledger ----------

function activityLedgerSheet_() {
  return ensureSheet_(ACTIVITY_LEDGER_SHEET, ACTIVITY_LEDGER_HEADERS);
}

function activityIdSet_() {
  var sheet = activityLedgerSheet_();
  var lastRow = sheet.getLastRow();
  var seen = {};
  if (lastRow < 2) return seen;
  var count = Math.min(ACTIVITY_DEDUPE_WINDOW, lastRow - 1);
  var start = lastRow - count + 1;
  var values = sheet.getRange(start, 1, count, 1).getValues();
  values.forEach(function (r) { if (r[0]) seen[String(r[0])] = true; });
  return seen;
}

function activityEventRow_(event) {
  return [
    str_(event.event_id, 240),
    str_(event.occurred_at, 64),
    str_(event.observed_at || nowIso_(), 64),
    str_(event.project_id, 80),
    str_(event.project_name, 160),
    str_(event.source_type, 60),
    str_(event.source_locator, 300),
    str_(event.activity_type, 40),
    str_(event.summary, 800),
    str_(event.evidence_url, 800),
    str_(event.evidence_level || 'OBSERVED', 40),
    str_(event.metadata_json, 1500)
  ];
}

function appendActivityEvents_(events, seen) {
  var rows = [];
  (events || []).forEach(function (event) {
    if (!event || !event.event_id || !event.project_id || !event.occurred_at) return;
    if (seen && seen[event.event_id]) return;
    rows.push(activityEventRow_(event));
    if (seen) seen[event.event_id] = true;
  });
  if (!rows.length) return 0;
  var sheet = activityLedgerSheet_();
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, ACTIVITY_LEDGER_HEADERS.length).setValues(rows);
  return rows.length;
}

function appendActivityEvent_(event, seen) {
  return appendActivityEvents_([event], seen) === 1;
}

function ledgerRowToEvent_(row) {
  var projectId = str_(row[3], 80);
  if (!projectId) return null;
  var parsed = parseCellDate_(row[1]);
  if (!parsed.iso) return null;
  return {
    event_id: str_(row[0], 240),
    occurred_at: parsed.iso,
    observed_at: cellIso_(row[2]),
    project_id: projectId,
    project_name: str_(row[4], 160),
    source_type: str_(row[5], 60),
    source_locator: str_(row[6], 300),
    activity_type: str_(row[7], 40).toLowerCase(),
    summary: str_(row[8], 800),
    evidence_url: str_(row[9], 800),
    evidence_level: str_(row[10], 40)
  };
}

// ---------- classification & selection ----------

/**
 * Evidence class of a ledger event. Higher rank = higher quality evidence of real work.
 *   heartbeat (explicit, structured) › run_report (structured report/checkpoint from an agent or canonical
 *   source) › github (inferred from commits/PRs) › drive (canonical file modification) › automation (routine
 *   generated refresh; counts only when the project's source opts in) · control_check never counts.
 */
function activityClass_(e) {
  var type = String(e.activity_type || '').toLowerCase();
  var source = String(e.source_type || '').toLowerCase();
  if (type === 'control_check' || source === 'control_check') return 'control_check';
  if (type === 'automation') return 'automation';
  if (source.indexOf('heartbeat') >= 0) return 'heartbeat';
  if (source.indexOf('github') === 0) return 'github';
  if (source.indexOf('drive') === 0) return 'drive';
  if (type === 'report' || type === 'checkpoint' || type === 'progress') return 'run_report';
  return 'run_report';
}

var ACTIVITY_CLASS_RANK = { heartbeat: 5, run_report: 4, github: 3, drive: 2, automation: 1, curated_board: 0, control_check: -1 };

function newerOrHigher_(a, b) {
  // true when a should replace b as "best of its class": newer wins, equal time → higher rank wins
  if (!b) return true;
  if (a.occurred_at !== b.occurred_at) return a.occurred_at > b.occurred_at;
  return (ACTIVITY_CLASS_RANK[activityClass_(a)] || 0) > (ACTIVITY_CLASS_RANK[activityClass_(b)] || 0);
}

/** Per project: newest event overall, newest meaningful, and newest per evidence class. */
function latestActivityByProject_() {
  var sheet = activityLedgerSheet_();
  var lastRow = sheet.getLastRow();
  var out = {};
  if (lastRow < 2) return out;
  var count = Math.min(ACTIVITY_LATEST_WINDOW, lastRow - 1);
  var start = lastRow - count + 1;
  var values = sheet.getRange(start, 1, count, ACTIVITY_LEDGER_HEADERS.length).getValues();
  values.forEach(function (row) {
    var e = ledgerRowToEvent_(row);
    if (!e) return;
    var cls = activityClass_(e);
    if (cls === 'control_check') return; // never project activity
    var slot = out[e.project_id] || { any: null, meaningful: null, byClass: {} };
    if (newerOrHigher_(e, slot.any)) slot.any = e;
    if (cls !== 'automation' && newerOrHigher_(e, slot.meaningful)) slot.meaningful = e;
    if (newerOrHigher_(e, slot.byClass[cls])) slot.byClass[cls] = e;
    out[e.project_id] = slot;
  });
  return out;
}

function boardProgressEvent_(p) {
  if (!p.last_meaningful_progress) return null;
  return {
    occurred_at: p.last_meaningful_progress,
    activity_type: 'progress',
    source_type: 'project_board',
    summary: p.progress_evidence || 'עדכון התקדמות בלוח',
    evidence_url: p.link || '',
    evidence_level: 'CURATED'
  };
}

/**
 * Select the effective project activity from the ledger slot and the curated board value.
 * Rules: control_check never; automation only when includeAutomation; newest evidence wins, but an explicit
 * heartbeat outranks inferred GitHub/Drive/automation evidence that is at most HEARTBEAT_DOMINANCE_MS newer
 * (same work window); equal timestamps → higher-quality class; curated board only when nothing in the
 * ledger qualifies or the board is strictly newer than every qualifying ledger event.
 */
function selectEffectiveActivity_(slot, board, includeAutomation) {
  var byClass = (slot && slot.byClass) || {};
  var candidates = [];
  ['heartbeat', 'run_report', 'github', 'drive'].forEach(function (c) { if (byClass[c]) candidates.push(byClass[c]); });
  if (includeAutomation && byClass.automation) candidates.push(byClass.automation);
  var chosen = null;
  candidates.forEach(function (e) { if (newerOrHigher_(e, chosen)) chosen = e; });
  var heartbeat = byClass.heartbeat || null;
  if (heartbeat && chosen && chosen !== heartbeat) {
    var gap = Date.parse(chosen.occurred_at) - Date.parse(heartbeat.occurred_at);
    if (gap >= 0 && gap <= HEARTBEAT_DOMINANCE_MS) chosen = heartbeat;
  }
  if (board && (!chosen || board.occurred_at > chosen.occurred_at)) {
    return { event: board, origin: 'curated_board' };
  }
  if (!chosen) return null;
  return { event: chosen, origin: activityClass_(chosen) };
}

function copyActivityFields_(p, prefix, e) {
  p[prefix + '_at'] = e ? e.occurred_at : '';
  p[prefix + '_type'] = e ? e.activity_type : '';
  p[prefix + '_source'] = e ? e.source_type : '';
  p[prefix + '_summary'] = e ? e.summary : '';
  p[prefix + '_evidence_url'] = e ? e.evidence_url : '';
  p[prefix + '_evidence_level'] = e ? e.evidence_level : '';
}

/**
 * Enrich portfolio rows with live activity WITHOUT touching curated status fields.
 * Backwards compatibility: last_meaningful_progress becomes the EFFECTIVE activity time (what a 0.7 client
 * shows in its time wall); the curated cell is preserved as curated_last_meaningful_progress. The raw text
 * field is kept only when the curated value was selected, so it still reads as evidence.
 */
function enrichPortfolioWithActivity_(projects) {
  // Activity tabs being unreadable must never break the portfolio read: degrade to curated values.
  var byProject = {};
  var automationPolicy = {};
  try { byProject = latestActivityByProject_(); } catch (e) { console.error('ledger read failed: ' + e); }
  try { automationPolicy = automationPolicyByProject_(); } catch (e) { console.error('sources read failed: ' + e); }
  projects.forEach(function (p) {
    var slot = byProject[p.id] || { any: null, meaningful: null, byClass: {} };
    var board = boardProgressEvent_(p);
    var selected = selectEffectiveActivity_(slot, board, !!automationPolicy[p.id]);
    var latestAny = slot.any;
    if (board && newerOrHigher_(board, latestAny)) latestAny = board;

    p.curated_last_meaningful_progress = p.last_meaningful_progress || '';
    p.curated_last_meaningful_progress_raw = p.last_meaningful_progress_raw || '';
    if (selected) {
      p.last_meaningful_progress = selected.event.occurred_at;
      if (selected.origin !== 'curated_board') p.last_meaningful_progress_raw = '';
      p.activity_origin = selected.origin;
    } else {
      p.activity_origin = 'none';
    }
    copyActivityFields_(p, 'selected_activity', selected ? selected.event : null);
    copyActivityFields_(p, 'latest_activity', latestAny);
    copyActivityFields_(p, 'latest_meaningful_activity', selected && selected.event.activity_type !== 'automation' ? selected.event : slot.meaningful || board);
  });
  // Most recent effective activity first (falls back to control check); rows without a date sink.
  projects.sort(function (a, b) {
    return ((b.last_meaningful_progress || b.last_check) || '').localeCompare((a.last_meaningful_progress || a.last_check) || '');
  });
  return projects;
}

// ---------- direct heartbeat ----------

function knownProjectIds_() {
  var ids = {};
  try {
    readPortfolio_().forEach(function (p) { ids[p.id] = p.name; });
  } catch (e) { /* board unreadable: fall through to sources */ }
  readActivitySources_().forEach(function (s) { if (!ids[s.project_id]) ids[s.project_id] = s.project_name; });
  return ids;
}

function normalizeHeartbeatTime_(value) {
  if (!value) return nowIso_();
  var parsed = parseCellDate_(value);
  return parsed.iso || '';
}

function sanitizeEventIdPart_(value) {
  return str_(value, 120).replace(/[^A-Za-z0-9._:-]/g, '_');
}

/**
 * Direct structured heartbeat from an authenticated gateway caller (agents, run reports).
 * Append-only, validated, deterministic dedupe: client_event_id → 'heartbeat:<id>', else a digest of the
 * (project, time, source, type, summary) tuple. Never accepts sheet names, ranges or file IDs.
 */
function recordActivityHeartbeat_(p) {
  var projectId = str_(p.project_id, 80).trim();
  if (!projectId) throw new Error('project_id is required');
  var known = knownProjectIds_();
  if (!known.hasOwnProperty(projectId)) throw new Error('unknown project_id');
  var occurredAt = normalizeHeartbeatTime_(p.occurred_at);
  if (!occurredAt) throw new Error('occurred_at is not a supported timestamp');
  if (Date.parse(occurredAt) > Date.now() + 5 * 60 * 1000) throw new Error('occurred_at is in the future');
  var sourceType = str_(p.source_type || p.source || 'agent_heartbeat', 60).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'agent_heartbeat';
  var activityType = str_(p.activity_type || 'progress', 40).trim().toLowerCase();
  if (ACTIVITY_TYPES.indexOf(activityType) < 0) throw new Error('activity_type must be one of ' + ACTIVITY_TYPES.join('|'));
  var summary = str_(p.summary, 800).trim();
  if (!summary) throw new Error('summary is required');
  var evidenceUrl = str_(p.evidence_url || p.evidence_ref, 800).trim();
  if (evidenceUrl && !/^https?:\/\//i.test(evidenceUrl)) throw new Error('evidence_url must be http(s)');
  var evidenceLevel = str_(p.evidence_level || 'REPORTED', 40).trim().toUpperCase();
  if (EVIDENCE_LEVELS.indexOf(evidenceLevel) < 0) evidenceLevel = 'REPORTED';
  var metadata = '';
  if (p.metadata && typeof p.metadata === 'object') metadata = str_(JSON.stringify(p.metadata), 1500);
  else if (p.metadata_json) metadata = str_(p.metadata_json, 1500);

  var clientId = sanitizeEventIdPart_(p.client_event_id || p.event_id);
  var eventId;
  if (clientId) {
    eventId = 'heartbeat:' + clientId;
  } else {
    var material = projectId + '|' + occurredAt + '|' + sourceType + '|' + activityType + '|' + summary;
    var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, material, Utilities.Charset.UTF_8);
    eventId = 'heartbeat:' + Utilities.base64EncodeWebSafe(digest).replace(/=+$/, '').slice(0, 32);
  }
  var seen = activityIdSet_();
  var inserted = appendActivityEvent_({
    event_id: eventId,
    occurred_at: occurredAt,
    observed_at: nowIso_(),
    project_id: projectId,
    project_name: str_(p.project_name, 160) || known[projectId] || '',
    source_type: sourceType,
    source_locator: str_(p.source_locator, 300),
    activity_type: activityType,
    summary: summary,
    evidence_url: evidenceUrl,
    evidence_level: evidenceLevel,
    metadata_json: metadata
  }, seen);
  return { recorded: inserted, duplicate: !inserted, event_id: eventId, occurred_at: occurredAt, project_id: projectId };
}

// ---------- GitHub observer (public repos, anonymous; optional token only raises quota) ----------

function githubHeaders_(etag) {
  var headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Ariel-Control-Tower/0.9'
  };
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_READ_TOKEN');
  if (token) headers.Authorization = 'Bearer ' + token;
  if (etag) headers['If-None-Match'] = etag;
  return headers;
}

/** GET with ETag support: 304 costs no rate-limit quota and yields {notModified: true}. */
function githubJson_(url, etag) {
  var res = UrlFetchApp.fetch(url, { method: 'get', headers: githubHeaders_(etag), muteHttpExceptions: true });
  var code = res.getResponseCode();
  if (code === 304) return { ok: true, notModified: true, status: 304, body: null, etag: etag, error: '' };
  if (code < 200 || code >= 300) {
    var remaining = '';
    try { remaining = String((res.getHeaders() || {})['x-ratelimit-remaining'] || ''); } catch (e) {}
    var error = (code === 403 || code === 429) && remaining === '0' ? 'rate_limited'
      : code === 404 ? 'not_found_or_private_repo (set GITHUB_READ_TOKEN)'
      : code === 401 ? 'bad_github_token'
      : ('http_' + code);
    return { ok: false, status: code, body: null, error: error };
  }
  var newEtag = '';
  try { newEtag = String((res.getHeaders() || {})['ETag'] || (res.getHeaders() || {})['etag'] || ''); } catch (e) {}
  try {
    return { ok: true, notModified: false, status: code, body: JSON.parse(res.getContentText()), etag: newEtag, error: '' };
  } catch (e) {
    return { ok: false, status: code, body: null, error: 'invalid_json' };
  }
}

/**
 * Conservative automation detector: bot accounts and clearly mechanical refresh/feed/snapshot commits.
 * Human and AI-assistant implementation commits ("feat:", "fix:", "Add …") are NOT automation.
 */
function isAutomationCommit_(commit) {
  var author = commit && commit.author && commit.author.login ? String(commit.author.login).toLowerCase() : '';
  var committer = commit && commit.committer && commit.committer.login ? String(commit.committer.login).toLowerCase() : '';
  var message = commit && commit.commit && commit.commit.message ? String(commit.commit.message).toLowerCase() : '';
  if (author.indexOf('[bot]') >= 0 || committer.indexOf('[bot]') >= 0 || author.indexOf('github-actions') >= 0 || committer.indexOf('github-actions') >= 0) return true;
  return /^(chore\((?:data|feed|refresh|snapshot|digest)\)|data|feed|refresh|snapshot|digest|auto(?:mated)? (?:refresh|update|feed))(:|\s|$)/.test(message);
}

function githubCommitEvent_(source, commit) {
  if (!commit || !commit.sha || !commit.commit) return null;
  var when = commit.commit.committer && commit.commit.committer.date ? commit.commit.committer.date :
    commit.commit.author && commit.commit.author.date ? commit.commit.author.date : '';
  var parsed = parseCellDate_(when);
  if (!parsed.iso) return null;
  var automation = isAutomationCommit_(commit);
  var firstLine = str_(commit.commit.message || '', 500).split('\n')[0];
  return {
    event_id: 'github_commit:' + source.locator + ':' + commit.sha,
    occurred_at: parsed.iso,
    project_id: source.project_id,
    project_name: source.project_name,
    source_type: 'github_commit',
    source_locator: source.locator,
    activity_type: automation ? 'automation' : 'progress',
    summary: firstLine || ('Commit ' + String(commit.sha).slice(0, 7)),
    evidence_url: commit.html_url || ('https://github.com/' + source.locator + '/commit/' + commit.sha),
    evidence_level: 'OBSERVED',
    metadata_json: JSON.stringify({ sha: commit.sha, branch: source.branch, automation: automation })
  };
}

function githubPrEvent_(source, pr) {
  if (!pr || !pr.number) return null;
  var when = pr.merged_at || pr.updated_at || pr.created_at;
  var parsed = parseCellDate_(when);
  if (!parsed.iso) return null;
  var state = pr.merged_at ? 'merged' : (pr.state || 'updated');
  return {
    event_id: 'github_pr:' + source.locator + ':' + pr.number + ':' + parsed.iso,
    occurred_at: parsed.iso,
    project_id: source.project_id,
    project_name: source.project_name,
    source_type: 'github_pr',
    source_locator: source.locator,
    activity_type: 'progress',
    summary: 'PR #' + pr.number + ' · ' + state + ': ' + str_(pr.title, 500),
    evidence_url: pr.html_url || ('https://github.com/' + source.locator + '/pull/' + pr.number),
    evidence_level: 'OBSERVED',
    metadata_json: JSON.stringify({ number: pr.number, state: pr.state || '', merged_at: pr.merged_at || '' })
  };
}

/**
 * Map one GitHub Events API item to a ledger event with STABLE ids:
 *   PushEvent            → github_commit:<repo>:<head sha>
 *   PullRequestEvent     → github_pr:<repo>:<number>:<meaningful timestamp>  (merge uses merged_at)
 *   PR review events     → github_pr:<repo>:<number>:review:<timestamp>      (checkpoint)
 * Anything else (stars, forks, issues, …) is not project activity.
 */
function githubRepoEvent_(source, event) {
  if (!event || !event.id || !event.created_at) return null;
  var parsed = parseCellDate_(event.created_at);
  if (!parsed.iso) return null;
  var payload = event.payload || {};
  var actor = event.actor && event.actor.login ? String(event.actor.login) : '';
  var type = String(event.type || '');

  if (type === 'PushEvent') {
    var commits = Array.isArray(payload.commits) ? payload.commits : [];
    var last = commits.length ? commits[commits.length - 1] : null;
    var message = last && last.message ? String(last.message).split('\n')[0] : '';
    var sha = String(payload.head || (last && last.sha) || '');
    if (!sha) return null;
    var synthetic = { author: { login: actor }, committer: { login: actor }, commit: { message: message } };
    var automation = isAutomationCommit_(synthetic);
    var branch = String(payload.ref || '').replace('refs/heads/', '');
    return {
      event_id: 'github_commit:' + source.locator + ':' + sha,
      occurred_at: parsed.iso,
      project_id: source.project_id,
      project_name: source.project_name,
      source_type: 'github_commit',
      source_locator: source.locator,
      activity_type: automation ? 'automation' : 'progress',
      summary: (message || ('Push to ' + branch)) + (branch && branch !== source.branch ? ' (' + branch + ')' : ''),
      evidence_url: 'https://github.com/' + source.locator + '/commit/' + sha,
      evidence_level: 'OBSERVED',
      metadata_json: JSON.stringify({ github_event_id: event.id, sha: sha, branch: branch, actor: actor, commits: commits.length, automation: automation })
    };
  }
  if (type === 'PullRequestEvent') {
    var pr = payload.pull_request || {};
    var number = pr.number || payload.number || '';
    if (!number) return null;
    var action = String(payload.action || 'updated');
    var merged = action === 'closed' && (pr.merged === true || !!pr.merged_at);
    var when = merged && pr.merged_at ? parseCellDate_(pr.merged_at).iso || parsed.iso : parsed.iso;
    var label = merged ? 'merged' : action;
    return {
      event_id: 'github_pr:' + source.locator + ':' + number + ':' + when,
      occurred_at: when,
      project_id: source.project_id,
      project_name: source.project_name,
      source_type: 'github_pr',
      source_locator: source.locator,
      activity_type: 'progress',
      summary: 'PR #' + number + ' · ' + label + ': ' + str_(pr.title, 500),
      evidence_url: pr.html_url || ('https://github.com/' + source.locator + '/pull/' + number),
      evidence_level: 'OBSERVED',
      metadata_json: JSON.stringify({ github_event_id: event.id, number: number, action: action, merged: merged, merged_at: pr.merged_at || '', actor: actor })
    };
  }
  if (type === 'PullRequestReviewEvent' || type === 'PullRequestReviewCommentEvent') {
    var reviewPr = payload.pull_request || {};
    if (!reviewPr.number) return null;
    return {
      event_id: 'github_pr:' + source.locator + ':' + reviewPr.number + ':review:' + parsed.iso,
      occurred_at: parsed.iso,
      project_id: source.project_id,
      project_name: source.project_name,
      source_type: 'github_pr',
      source_locator: source.locator,
      activity_type: 'checkpoint',
      summary: 'PR #' + reviewPr.number + ' · review: ' + str_(reviewPr.title, 500),
      evidence_url: reviewPr.html_url || ('https://github.com/' + source.locator + '/pull/' + reviewPr.number),
      evidence_level: 'OBSERVED',
      metadata_json: JSON.stringify({ github_event_id: event.id, number: reviewPr.number, actor: actor })
    };
  }
  return null;
}

/**
 * One conditional Events API call per repository per scan (6 sources → 6 calls / 15 min, far below the
 * anonymous 60/h limit; 304s are free). Catches pushes on any branch plus PR/review activity.
 */
function pollGithubSource_(source, seen) {
  var props = PropertiesService.getScriptProperties();
  var etagKey = ACTIVITY_GITHUB_ETAG_PREFIX + source.locator;
  var etag = props.getProperty(etagKey) || '';
  var res = githubJson_('https://api.github.com/repos/' + source.locator + '/events?per_page=20', etag);
  if (!res.ok) return { inserted: 0, latest: '', errors: ['events:' + res.error] };
  if (res.notModified) return { inserted: 0, latest: '', errors: [], not_modified: true };
  if (!Array.isArray(res.body)) return { inserted: 0, latest: '', errors: ['events:invalid_body'] };
  if (res.etag) props.setProperty(etagKey, res.etag);
  var latest = '';
  var pending = [];
  for (var i = res.body.length - 1; i >= 0; i--) {
    var e = githubRepoEvent_(source, res.body[i]);
    if (!e) continue;
    if (!source.include_automation && e.activity_type === 'automation') continue; // never even recorded
    if (!latest || e.occurred_at > latest) latest = e.occurred_at;
    pending.push(e);
  }
  var inserted = appendActivityEvents_(pending, seen);
  return { inserted: inserted, latest: latest, errors: [] };
}

// ---------- Drive observer ----------

function pollDriveFileSource_(source, seen) {
  var file = DriveApp.getFileById(source.locator);
  var updated = file.getLastUpdated();
  if (!updated || isNaN(updated.getTime())) return { inserted: 0, latest: '', errors: ['no_modified_time'] };
  var iso = updated.toISOString();
  var event = {
    event_id: 'drive_file:' + source.locator + ':' + iso,
    occurred_at: iso,
    project_id: source.project_id,
    project_name: source.project_name,
    source_type: 'drive_file',
    source_locator: source.locator,
    activity_type: 'report',
    summary: 'עודכן המקור הקנוני ב-Drive: ' + file.getName(),
    evidence_url: file.getUrl(),
    evidence_level: 'OBSERVED',
    metadata_json: JSON.stringify({ name: file.getName() })
  };
  return { inserted: appendActivityEvent_(event, seen) ? 1 : 0, latest: iso, errors: [] };
}

// ---------- scan lifecycle (runs inside the existing 15-minute scanner) ----------

function saveActivityScanState_(state) {
  try {
    PropertiesService.getScriptProperties().setProperty(ACTIVITY_SCAN_STATE_KEY, JSON.stringify(state));
  } catch (e) { /* properties unavailable: health reports unknown */ }
}

function readActivityScanState_() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(ACTIVITY_SCAN_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Poll every enabled source. One failing source never stops the others, never throws, and never blocks
 * the push scanner or portfolio reads. Failures are recorded (bounded, no secrets) for health.
 */
function pollActivitySources_() {
  var sources = readActivitySources_();
  var seen = activityIdSet_();
  var sourceSheet = ensureSheet_(ACTIVITY_SOURCES_SHEET, ACTIVITY_SOURCE_HEADERS);
  var now = nowIso_();
  var inserted = 0, checked = 0, failures = [];

  sources.forEach(function (source) {
    if (!source.enabled) return;
    checked++;
    var result = { inserted: 0, latest: '', errors: [] };
    try {
      if (source.source_type === 'github_repo') result = pollGithubSource_(source, seen);
      else if (source.source_type === 'drive_file') result = pollDriveFileSource_(source, seen);
      else result.errors.push('unsupported:' + source.source_type);
    } catch (err) {
      result.errors.push(str_(err && err.message ? err.message : err, 120));
    }
    inserted += result.inserted;
    if (result.errors.length) failures.push(source.project_id + ':' + result.errors.join(','));
    try {
      sourceSheet.getRange(source.row, 8).setValue(now);
      if (result.latest) sourceSheet.getRange(source.row, 9).setValue(result.latest);
    } catch (e) { /* bookkeeping only */ }
  });
  var state = {
    at: now,
    status: failures.length === 0 ? 'ok' : (failures.length < checked ? 'partial' : 'failed'),
    checked: checked,
    inserted: inserted,
    failures: failures.slice(0, 10)
  };
  saveActivityScanState_(state);
  return { checked: checked, inserted: inserted, errors: failures };
}

// ---------- read models ----------

function listProjectActivity_(limit, projectId) {
  var sheet = activityLedgerSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var count = Math.min(ACTIVITY_LATEST_WINDOW, lastRow - 1);
  var start = lastRow - count + 1;
  var values = sheet.getRange(start, 1, count, ACTIVITY_LEDGER_HEADERS.length).getValues();
  var items = [];
  for (var i = values.length - 1; i >= 0; i--) {
    var row = values[i];
    if (projectId && String(row[3]) !== projectId) continue;
    var e = ledgerRowToEvent_(row);
    if (!e) continue;
    items.push(e);
  }
  items.sort(function (a, b) { return String(b.occurred_at).localeCompare(String(a.occurred_at)); });
  return items.slice(0, limit);
}

function activityHealth_() {
  var sources = readActivitySources_();
  var ledger = activityLedgerSheet_();
  var lastObserved = '';
  if (ledger.getLastRow() >= 2) {
    var count = Math.min(ACTIVITY_LATEST_WINDOW, ledger.getLastRow() - 1);
    var values = ledger.getRange(ledger.getLastRow() - count + 1, 2, count, 1).getValues();
    values.forEach(function (r) {
      var p = parseCellDate_(r[0]);
      if (p.iso && p.iso > lastObserved) lastObserved = p.iso;
    });
  }
  var scan = readActivityScanState_() || {};
  var tokenConfigured = false;
  try { tokenConfigured = !!PropertiesService.getScriptProperties().getProperty('GITHUB_READ_TOKEN'); } catch (e) {}
  return {
    sources_enabled: sources.filter(function (s) { return s.enabled; }).length,
    ledger_events: Math.max(0, ledger.getLastRow() - 1),
    latest_observed_activity: lastObserved,
    // Task-mandated health fields
    activity_sources_enabled: sources.filter(function (s) { return s.enabled; }).length,
    activity_last_scan_at: scan.at || '',
    activity_scan_status: scan.status || 'never',
    activity_source_failures: scan.failures || [],
    activity_ledger_latest_at: lastObserved,
    // Private repositories are observable only with a read-only token in Script Properties (boolean only, never the value).
    activity_github_token_configured: tokenConfigured
  };
}
