import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deepMerge, deepForceBase, computeDiff } from '../src/merge.js';
import * as jsonParser from '../src/parsers/json.js';
import * as tomlParser from '../src/parsers/toml.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => join(__dirname, 'fixtures', name);

describe('deepMerge', () => {
  it('merges flat objects', () => {
    const base = { a: 1, b: 2 };
    const sw = { b: 3, c: 4 };
    assert.deepEqual(deepMerge(base, sw), { a: 1, b: 3, c: 4 });
  });

  it('merges nested objects recursively', () => {
    const base = { a: { x: 1, y: 2 }, b: 1 };
    const sw = { a: { y: 3, z: 4 } };
    assert.deepEqual(deepMerge(base, sw), { a: { x: 1, y: 3, z: 4 }, b: 1 });
  });

  it('replaces arrays (not appends)', () => {
    const base = { list: [1, 2, 3] };
    const sw = { list: [4, 5] };
    assert.deepEqual(deepMerge(base, sw), { list: [4, 5] });
  });

  it('null in switch deletes the key', () => {
    const base = { a: 1, b: 2 };
    const sw = { b: null };
    assert.deepEqual(deepMerge(base, sw), { a: 1 });
  });

  it('handles null base', () => {
    assert.deepEqual(deepMerge(null, { a: 1 }), { a: 1 });
  });

  it('handles null switch', () => {
    assert.deepEqual(deepMerge({ a: 1 }, null), { a: 1 });
  });

  it('switch scalar overrides object', () => {
    const base = { a: { x: 1 } };
    const sw = { a: 'replaced' };
    assert.deepEqual(deepMerge(base, sw), { a: 'replaced' });
  });
});

describe('deepForceBase', () => {
  it('replaces base fields and preserves current-only fields', () => {
    const current = { model: 'gpt-5.5', base_url: 'http://127.0.0.1:8317', extra: true };
    const base = { model: 'gpt-5', approval_policy: 'suggest' };
    assert.deepEqual(deepForceBase(current, base), {
      model: 'gpt-5',
      approval_policy: 'suggest',
      base_url: 'http://127.0.0.1:8317',
      extra: true,
    });
  });

  it('recursively force-merges base fields', () => {
    const current = {
      windows: { sandbox: 'elevated', keep: true },
      projects: { demo: { trust_level: 'trusted' } },
    };
    const base = {
      windows: { sandbox: 'read-only', missing: 'base-only' },
      model: 'gpt-5',
    };
    assert.deepEqual(deepForceBase(current, base), {
      windows: { sandbox: 'read-only', missing: 'base-only', keep: true },
      projects: { demo: { trust_level: 'trusted' } },
      model: 'gpt-5',
    });
  });

  it('replaces non-object values when the same field has different shapes', () => {
    const current = { a: { x: 1 }, b: 'current' };
    const base = { a: 'base', b: { y: 2 } };
    assert.deepEqual(deepForceBase(current, base), { a: 'base', b: { y: 2 } });
  });
});

describe('computeDiff', () => {
  it('detects added keys', () => {
    const diffs = computeDiff({ a: 1 }, { a: 1, b: 2 });
    assert.equal(diffs.length, 1);
    assert.equal(diffs[0].type, 'added');
    assert.equal(diffs[0].path, 'b');
  });

  it('detects removed keys', () => {
    const diffs = computeDiff({ a: 1, b: 2 }, { a: 1 });
    assert.equal(diffs.length, 1);
    assert.equal(diffs[0].type, 'removed');
  });

  it('detects changed values', () => {
    const diffs = computeDiff({ a: 1 }, { a: 2 });
    assert.equal(diffs.length, 1);
    assert.equal(diffs[0].type, 'changed');
    assert.equal(diffs[0].from, 1);
    assert.equal(diffs[0].to, 2);
  });

  it('detects nested diffs', () => {
    const diffs = computeDiff({ a: { x: 1 } }, { a: { x: 2 } });
    assert.equal(diffs.length, 1);
    assert.equal(diffs[0].path, 'a.x');
  });
});

describe('JSON parser with real fixtures', () => {
  it('merges Claude Code settings', () => {
    const base = jsonParser.parse(fixture('base.settings.json'));
    const sw = jsonParser.parse(fixture('settings.json'));
    const merged = deepMerge(base, sw);

    // switch overrides model
    assert.equal(merged.model, 'claude-opus-4-7');
    // switch overrides env values
    assert.equal(merged.env.NODE_ENV, 'production');
    assert.equal(merged.env.API_URL, 'https://api.example.com');
    // base-only keys preserved
    assert.equal(merged.theme, 'dark');
    // arrays are replaced
    assert.deepEqual(merged.permissions.allow, [
      'Bash(npm test)',
      'Bash(npm run build)',
      'Bash(git *)',
      'Read',
      'Write',
    ]);
    // nested objects merged
    assert.ok(merged.hooks.PreToolUse);
  });
});

describe('TOML parser with real fixtures', () => {
  it('merges Codex config', () => {
    const base = tomlParser.parse(fixture('base.config.toml'));
    const sw = tomlParser.parse(fixture('config.toml'));
    const merged = deepMerge(base, sw);

    assert.equal(merged.model, 'codex-full');
    assert.equal(merged.approval_policy, 'auto-edit');
    // base-only preserved
    assert.equal(merged.sandbox_mode, 'read-only');
    // nested merge
    assert.equal(merged.sandbox_settings.network_access, true);
    assert.equal(merged.sandbox_settings.write_access, false);
    // base-only nested preserved
    assert.equal(merged.history.max_entries, 100);
  });
});
