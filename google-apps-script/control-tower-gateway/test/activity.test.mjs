import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const src = ['Config.gs', 'Portfolio.gs', 'Activity.gs']
  .map((f) => readFileSync(join(here, '..', f), 'utf8')).join('\n');

function context() {
  const ctx = {
    console,
    str_: (value, maxLen) => {
      if (value === null || value === undefined) return '';
      const s = String(value);
      return maxLen && s.length > maxLen ? s.slice(0, maxLen) : s;
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    Utilities: {
      Charset: { UTF_8: 'utf8' },
      DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: () => [1, 2, 3],
      base64EncodeWebSafe: () => 'AQID'
    },
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return ctx;
}

test('automation commits are classified separately from meaningful progress', () => {
  const ctx = context();
  assert.equal(ctx.isAutomationCommit_({
    author: { login: 'github-actions[bot]' },
    commit: { message: 'refresh feed snapshot' }
  }), true);
  assert.equal(ctx.isAutomationCommit_({
    author: { login: 'arieldeitch' },
    commit: { message: 'feat: improve project detail' }
  }), false);
});

test('GitHub commit event carries actual commit time and evidence URL', () => {
  const ctx = context();
  const source = { project_id: 'P-002', project_name: 'Household OS', locator: 'arieldeitch/child-s-day', branch: 'main' };
  const e = ctx.githubCommitEvent_(source, {
    sha: 'abc123',
    html_url: 'https://github.com/arieldeitch/child-s-day/commit/abc123',
    author: { login: 'arieldeitch' },
    commit: {
      message: 'feat: family board polish\n\nmore',
      committer: { date: '2026-09-19T04:27:35Z' },
      author: { date: '2026-09-19T04:27:35Z' }
    }
  });
  assert.equal(e.occurred_at, '2026-09-19T04:27:35.000Z');
  assert.equal(e.activity_type, 'progress');
  assert.equal(e.summary, 'feat: family board polish');
  assert.equal(e.evidence_level, 'OBSERVED');
});

test('one GitHub Events item captures PR-branch pushes and classifies automation', () => {
  const ctx = context();
  const source = { project_id: 'P-001', project_name: 'Ariel Life OS', locator: 'arieldeitch/ariel-habit-ai', branch: 'main' };
  const push = ctx.githubRepoEvent_(source, {
    id: 'evt-1',
    type: 'PushEvent',
    created_at: '2026-09-19T04:30:00Z',
    actor: { login: 'arieldeitch' },
    payload: {
      ref: 'refs/heads/feat/quiet-exit',
      head: 'abc123',
      commits: [{ sha: 'abc123', message: 'feat: quiet exit polish' }]
    }
  });
  assert.equal(push.occurred_at, '2026-09-19T04:30:00.000Z');
  assert.equal(push.activity_type, 'progress');
  assert.match(push.summary, /quiet exit/);
  assert.match(push.evidence_url, /abc123/);

  const bot = ctx.githubRepoEvent_(source, {
    id: 'evt-2',
    type: 'PushEvent',
    created_at: '2026-09-19T04:31:00Z',
    actor: { login: 'github-actions[bot]' },
    payload: { ref: 'refs/heads/main', head: 'def456', commits: [{ sha: 'def456', message: 'refresh feed snapshot' }] }
  });
  assert.equal(bot.activity_type, 'automation');
});

test('latest observed activity may be automation while latest meaningful stays progress', () => {
  const ctx = context();
  ctx.latestActivityByProject_ = () => ({
    'P-003': {
      any: {
        occurred_at: '2026-09-19T06:00:00.000Z',
        activity_type: 'automation',
        source_type: 'github_commit',
        summary: 'refresh feed',
        evidence_url: 'https://example/a',
        evidence_level: 'OBSERVED'
      },
      meaningful: {
        occurred_at: '2026-09-19T04:00:00.000Z',
        activity_type: 'progress',
        source_type: 'github_pr',
        summary: 'hardening',
        evidence_url: 'https://example/p',
        evidence_level: 'OBSERVED'
      }
    }
  });
  const p = {
    id: 'P-003',
    last_meaningful_progress: '2026-09-18T15:00:00.000Z',
    progress_evidence: 'older board note',
    link: ''
  };
  ctx.enrichPortfolioWithActivity_([p]);
  assert.equal(p.latest_activity_at, '2026-09-19T06:00:00.000Z');
  assert.equal(p.latest_activity_type, 'automation');
  assert.equal(p.latest_meaningful_activity_at, '2026-09-19T04:00:00.000Z');
  assert.equal(p.latest_meaningful_activity_type, 'progress');
});

test('curated board progress remains a valid fallback when newer than ledger', () => {
  const ctx = context();
  ctx.latestActivityByProject_ = () => ({
    'P-005': {
      any: { occurred_at: '2026-09-18T10:00:00.000Z', activity_type: 'progress', source_type: 'github_commit', summary: 'old', evidence_url: '', evidence_level: 'OBSERVED' },
      meaningful: { occurred_at: '2026-09-18T10:00:00.000Z', activity_type: 'progress', source_type: 'github_commit', summary: 'old', evidence_url: '', evidence_level: 'OBSERVED' }
    }
  });
  const p = {
    id: 'P-005',
    last_meaningful_progress: '2026-09-18T17:45:00.000Z',
    progress_evidence: 'verified runtime acceptance',
    link: 'https://example'
  };
  ctx.enrichPortfolioWithActivity_([p]);
  assert.equal(p.latest_activity_source, 'project_board');
  assert.equal(p.latest_meaningful_activity_source, 'project_board');
  assert.equal(p.latest_activity_summary, 'verified runtime acceptance');
});
