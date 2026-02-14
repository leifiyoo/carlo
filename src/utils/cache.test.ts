import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { buildCacheKey, readCache, writeCache } from './cache.js';

const TEST_CACHE_DIR = '.dexter/cache';

// ---------------------------------------------------------------------------
// buildCacheKey
// ---------------------------------------------------------------------------

describe('buildCacheKey', () => {
  test('produces the same key regardless of param insertion order', () => {
    const paramsA = { query: 'test', start_date: '2024-01-01', end_date: '2024-12-31', format: 'json', limit: 1 };
    const paramsB = { limit: 1, end_date: '2024-12-31', query: 'test', format: 'json', start_date: '2024-01-01' };
    expect(buildCacheKey('/search/', paramsA)).toBe(buildCacheKey('/search/', paramsB));
  });

  test('sorts array values without mutating the original', () => {
    const items = ['Item-7', 'Item-1', 'Item-1A'];
    const original = [...items];
    buildCacheKey('/data/items/', { query: 'test', item: items });
    expect(items).toEqual(original); // not mutated
  });

  test('produces different keys for different params', () => {
    const keyA = buildCacheKey('/search/', { query: 'test', start_date: '2024-01-01', end_date: '2024-06-30' });
    const keyB = buildCacheKey('/search/', { query: 'test', start_date: '2024-01-01', end_date: '2024-12-31' });
    expect(keyA).not.toBe(keyB);
  });

  test('includes ticker prefix for readable filenames', () => {
    const key = buildCacheKey('/search/', { ticker: 'GOOG', start_date: '2024-01-01', end_date: '2024-12-31' });
    expect(key).toMatch(/^search\/GOOG_/);
    expect(key).toMatch(/\.json$/);
  });

  test('omits undefined and null params', () => {
    const keyA = buildCacheKey('/search/', { query: 'test', start_date: '2024-01-01', end_date: '2024-12-31', limit: undefined });
    const keyB = buildCacheKey('/search/', { query: 'test', start_date: '2024-01-01', end_date: '2024-12-31' });
    expect(keyA).toBe(keyB);
  });
});

// ---------------------------------------------------------------------------
// readCache / writeCache round-trip
// ---------------------------------------------------------------------------

describe('readCache / writeCache', () => {
  beforeEach(() => {
    if (existsSync(TEST_CACHE_DIR)) {
      rmSync(TEST_CACHE_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(TEST_CACHE_DIR)) {
      rmSync(TEST_CACHE_DIR, { recursive: true });
    }
  });

  test('round-trips data through write then read', () => {
    const endpoint = '/search/';
    const params = { query: 'test', start_date: '2024-01-01', end_date: '2024-12-31', format: 'json', limit: 1 };
    const data = { results: [{ title: 'Test', url: 'https://example.com' }] };
    const url = 'https://api.example.com/search/?query=test&start_date=2024-01-01&end_date=2024-12-31';

    writeCache(endpoint, params, data, url);
    const cached = readCache(endpoint, params);

    expect(cached).not.toBeNull();
    expect(cached!.data).toEqual(data);
    expect(cached!.url).toBe(url);
  });

  test('returns null on cache miss (no file)', () => {
    const cached = readCache('/search/', { query: 'test', start_date: '2024-01-01', end_date: '2024-12-31' });
    expect(cached).toBeNull();
  });

  test('returns null and removes file when cache entry is corrupted JSON', () => {
    const endpoint = '/search/';
    const params = { query: 'test', start_date: '2024-01-01', end_date: '2024-12-31', format: 'json', limit: 1 };

    const key = buildCacheKey(endpoint, params);
    const filepath = join(TEST_CACHE_DIR, key);
    const dir = join(TEST_CACHE_DIR, key.split('/')[0]!);
    mkdirSync(dir, { recursive: true });
    writeFileSync(filepath, '{ broken json!!!');

    const cached = readCache(endpoint, params);
    expect(cached).toBeNull();
    expect(existsSync(filepath)).toBe(false);
  });

  test('returns null and removes file when cache entry has invalid structure', () => {
    const endpoint = '/search/';
    const params = { query: 'test', start_date: '2024-01-01', end_date: '2024-12-31', format: 'json', limit: 1 };

    const key = buildCacheKey(endpoint, params);
    const filepath = join(TEST_CACHE_DIR, key);
    const dir = join(TEST_CACHE_DIR, key.split('/')[0]!);
    mkdirSync(dir, { recursive: true });
    writeFileSync(filepath, JSON.stringify({ wrong: 'shape' }));

    const cached = readCache(endpoint, params);
    expect(cached).toBeNull();
    expect(existsSync(filepath)).toBe(false);
  });
});
