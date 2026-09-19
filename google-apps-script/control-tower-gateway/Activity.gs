/**
 * Activity observability — append-only project activity evidence.
 *
 * PROJECT_CONTROL_BOARD remains the canonical status/milestone truth.
 * ActivitySources configures observable signals; ActivityLedger records what happened and when.
 * This layer must never overwrite curated project status merely because code changed.
 */

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

function activityLedgerSheet_() {
  return ensureSheet_(ACTIVITY_LEDGER_SHEET, ACTIVITY_LEDGER_HEADERS);
}

function activityIdSet_() {
  var sheet = activityLedgerSheet_();
  var lastRow = sheet.getLastRow();
  var seen = {};
  if (lastRow < 2) return seen;
  var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  values.forEach(function (r) { if (r[0]) seen[String(r[0])] = true; });
  return seen;
}

function appendActivityEvent_(event, seen) {
  if (!event || !event.event_id || !event.project_id || !event.occurred_at) return false;
  if (seen && seen[event.event_id]) return false;
  var sheet = activityLedgerSheet_();
  sheet.appendRow([
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
  ]);
  if (seen) seen[event.event_id] = true;
  return true;
}

function normalizeHeartbeatTime_(value) {
  if (!value) return nowIso_();
  var parsed = parseCellDate_(value);
  return parsed.iso || '';
}

/** Direct structured heartbeat from a trusted gateway caller. */
function recordActivityHeartbeat_(p) {
  var projectId = str_(p.project_id, 80).trim();
  if (!projectId) throw new Error('project_id is required');
  var occurredAt = normalizeHeartbeatTime_(p.occurred_at);
  if (!occurredAt) throw new Error('occurred_at is not a supported timestamp');
  var sourceType = str_(p.source_type || p.source || 'agent_heartbeat', 60).trim();
  var activityType = str_(p.activity_type || 'report', 40).trim().toLowerCase();
  if (['progress', 'checkpoint', 'automation', 'report', 'control_check'].indexOf(activityType) < 0) activityType = 'report';
  var summary = str_(p.summary, 800).trim();
  if (!summary) throw new Error('summary is required');

  var eventId = str_(p.event_id, 240).trim();
  if (!eventId) {
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
    project_name: str_(p.project_name, 160),
    source_type: sourceType,
    source_locator: str_(p.source_locator, 300),
    activity_type: activityType,
    summary: summary,
    evidence_url: str_(p.evidence_url || p.evidence_ref, 800),
    evidence_level: str_(p.evidence_level || 'REPORTED', 40),
    metadata_json: typeof p.metadata === 'object' && p.metadata ? JSON.stringify(p.metadata) : str_(p.metadata_json, 1500)
  }, seen);
  return { recorded: inserted, event_id: eventId, occurred_at: occurredAt };
}

function githubHeaders_() {
  var headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Ariel-Control-Tower/0.8'
  };
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_READ_TOKEN');
  if (token) headers.Authorization = 'Bearer ' + token;
  return headers;
}

function githubJson_(url) {
  var res = UrlFetchApp.fetch(url, { method: 'get', headers: githubHeaders_(), muteHttpExceptions: true });
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    return { ok: false, status: code, body: null, error: res.getContentText().slice(0, 200) };
  }
  try {
    return { ok: true, status: code, body: JSON.parse(res.getContentText()), error: '' };
  } catch (e) {
    return { ok: false, status: code, body: null, error: 'invalid_json' };
  }
}

function isAutomationCommit_(commit) {
  var author = commit && commit.author && commit.author.login ? String(commit.author.login).toLowerCase() : '';
  var committer = commit && commit.committer && commit.committer.login ? String(commit.committer.login).toLowerCase() : '';
  var message = commit && commit.commit && commit.commit.message ? String(commit.commit.message).toLowerCase() : '';
  if (author.indexOf('[bot]') >= 0 || committer.indexOf('[bot]') >= 0 || author.indexOf('github-actions') >= 0 || committer.indexOf('github-actions') >= 0) return true;
  return /^(chore\((?:data|feed|refresh|snapshot)\)|data|feed|refresh)(:|\s)/.test(message);
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

function githubPrEvent_(source, pr) {
  if (!pr || !pr.number || !pr.updated_at) return null;
  var parsed = parseCellDate_(pr.updated_at);
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

function pollGithubSource_(source, seen) {
  var base = 'https://api.github.com/repos/' + source.locator;
  var branch = encodeURIComponent(source.branch || 'main');
  var commitRes = githubJson_(base + '/commits?per_page=1&sha=' + branch);
  var prRes = githubJson_(base + '/pulls?state=all&sort=updated&direction=desc&per_page=1');
  var inserted = 0;
  var latest = '';
  var errors = [];

  if (commitRes.ok && Array.isArray(commitRes.body) && commitRes.body.length) {
    var ce = githubCommitEvent_(source, commitRes.body[0]);
    if (ce) {
      if (source.include_automation || ce.activity_type !== 'automation') {
        if (appendActivityEvent_(ce, seen)) inserted++;
      }
      if (!latest || ce.occurred_at > latest) latest = ce.occurred_at;
    }
  } else if (!commitRes.ok) errors.push('commit:' + commitRes.status);

  if (prRes.ok && Array.isArray(prRes.body) && prRes.body.length) {
    var pe = githubPrEvent_(source, prRes.body[0]);
    if (pe) {
      if (appendActivityEvent_(pe, seen)) inserted++;
      if (!latest || pe.occurred_at > latest) latest = pe.occurred_at;
    }
  } else if (!prRes.ok) errors.push('pr:' + prRes.status);

  return { inserted: inserted, latest: latest, errors: errors };
}

/**
 * Poll all configured sources. Public GitHub repos require no token.
 * Optional GITHUB_READ_TOKEN only increases rate limit / enables intentionally configured private repos.
 */
function pollActivitySources_() {
  var sources = readActivitySources_();
  var seen = activityIdSet_();
  var sourceSheet = ensureSheet_(ACTIVITY_SOURCES_SHEET, ACTIVITY_SOURCE_HEADERS);
  var now = nowIso_();
  var inserted = 0, checked = 0, errors = [];

  sources.forEach(function (source) {
    if (!source.enabled) return;
    checked++;
    var result = { inserted: 0, latest: '', errors: [] };
    try {
      if (source.source_type === 'github_repo') result = pollGithubSource_(source, seen);
      else if (source.source_type === 'drive_file') result = pollDriveFileSource_(source, seen);
      else result.errors.push('unsupported:' + source.source_type);
    } catch (err) {
      result.errors.push(String(err && err.message ? err.message : err));
    }
    inserted += result.inserted;
    if (result.errors.length) errors.push(source.project_id + ':' + result.errors.join(','));
    sourceSheet.getRange(source.row, 8).setValue(now);
    if (result.latest) sourceSheet.getRange(source.row, 9).setValue(result.latest);
  });
  return { checked: checked, inserted: inserted, errors: errors };
}

function latestActivityByProject_() {
  var sheet = activityLedgerSheet_();
  var lastRow = sheet.getLastRow();
  var out = {};
  if (lastRow < 2) return out;
  var values = sheet.getRange(2, 1, lastRow - 1, ACTIVITY_LEDGER_HEADERS.length).getValues();
  values.forEach(function (row) {
    var projectId = str_(row[3], 80);
    if (!projectId) return;
    var parsed = parseCellDate_(row[1]);
    if (!parsed.iso) return;
    var e = {
      event_id: str_(row[0], 240),
      occurred_at: parsed.iso,
      observed_at: cellIso_(row[2]),
      project_id: projectId,
      project_name: str_(row[4], 160),
      source_type: str_(row[5], 60),
      source_locator: str_(row[6], 300),
      activity_type: str_(row[7], 40),
      summary: str_(row[8], 800),
      evidence_url: str_(row[9], 800),
      evidence_level: str_(row[10], 40)
    };
    var slot = out[projectId] || { any: null, meaningful: null };
    if (!slot.any || e.occurred_at > slot.any.occurred_at) slot.any = e;
    if (e.activity_type !== 'automation' && e.activity_type !== 'control_check') {
      if (!slot.meaningful || e.occurred_at > slot.meaningful.occurred_at) slot.meaningful = e;
    }
    out[projectId] = slot;
  });
  return out;
}

function copyActivityFields_(p, prefix, e) {
  p[prefix + '_at'] = e ? e.occurred_at : '';
  p[prefix + '_type'] = e ? e.activity_type : '';
  p[prefix + '_source'] = e ? e.source_type : '';
  p[prefix + '_summary'] = e ? e.summary : '';
  p[prefix + '_evidence_url'] = e ? e.evidence_url : '';
  p[prefix + '_evidence_level'] = e ? e.evidence_level : '';
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

/** Enrich portfolio rows without mutating canonical status fields. */
function enrichPortfolioWithActivity_(projects) {
  var byProject = latestActivityByProject_();
  projects.forEach(function (p) {
    var slot = byProject[p.id] || { any: null, meaningful: null };
    var board = boardProgressEvent_(p);
    var latestAny = slot.any;
    var latestMeaningful = slot.meaningful;
    if (board && (!latestAny || board.occurred_at > latestAny.occurred_at)) latestAny = board;
    if (board && (!latestMeaningful || board.occurred_at > latestMeaningful.occurred_at)) latestMeaningful = board;
    copyActivityFields_(p, 'latest_activity', latestAny);
    copyActivityFields_(p, 'latest_meaningful_activity', latestMeaningful);
  });
  return projects;
}

function listProjectActivity_(limit, projectId) {
  var sheet = activityLedgerSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, ACTIVITY_LEDGER_HEADERS.length).getValues();
  var items = [];
  for (var i = values.length - 1; i >= 0 && items.length < limit; i--) {
    var row = values[i];
    if (projectId && String(row[3]) !== projectId) continue;
    items.push({
      event_id: str_(row[0], 240),
      occurred_at: cellIso_(row[1]),
      observed_at: cellIso_(row[2]),
      project_id: str_(row[3], 80),
      project_name: str_(row[4], 160),
      source_type: str_(row[5], 60),
      activity_type: str_(row[7], 40),
      summary: str_(row[8], 800),
      evidence_url: str_(row[9], 800),
      evidence_level: str_(row[10], 40)
    });
  }
  items.sort(function (a, b) { return String(b.occurred_at).localeCompare(String(a.occurred_at)); });
  return items.slice(0, limit);
}

function activityHealth_() {
  var sources = readActivitySources_();
  var ledger = activityLedgerSheet_();
  var lastObserved = '';
  if (ledger.getLastRow() >= 2) {
    var values = ledger.getRange(2, 2, ledger.getLastRow() - 1, 1).getValues();
    values.forEach(function (r) {
      var p = parseCellDate_(r[0]);
      if (p.iso && p.iso > lastObserved) lastObserved = p.iso;
    });
  }
  return {
    sources_enabled: sources.filter(function (s) { return s.enabled; }).length,
    ledger_events: Math.max(0, ledger.getLastRow() - 1),
    latest_observed_activity: lastObserved
  };
}
