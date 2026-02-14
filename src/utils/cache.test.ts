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
    const paramsA = { query: 'hello', lang: 'en', limit: 5, page: 1, sort: 'relevance' };
    const paramsB = { sort: 'relevance', limit: 5, query: 'hello', lang: 'en', page: 1 };
    expect(buildCacheKey('/search/', paramsA)).toBe(buildCacheKey('/search/', paramsB));
  });

  test('sorts array values without mutating the original', () => {
    const items = ['Item-7', 'Item-1', 'Item-1A'];
    const original = [...items];
    buildCacheKey('/results/items/', { query: 'test', item: items });
    expect(items).toEqual(original); // not mutated
  });

  test('produces different keys for different params', () => {
    const keyA = buildCacheKey('/search/', { query: 'hello', lang: 'en', limit: 5 });
    const keyB = buildCacheKey('/search/', { query: 'hello', lang: 'en', limit: 10 });
    expect(keyA).not.toBe(keyB);
  });

  test('includes ticker prefix for readable filenames', () => {
    const key = buildCacheKey('/search/', { ticker: 'TEST', lang: 'en', limit: 5 });
    expect(key).toMatch(/^search\/TEST_/);
    expect(key).toMatch(/\.json$/);
  });

  test('omits undefined and null params', () => {
    const keyA = buildCacheKey('/search/', { query: 'hello', lang: 'en', limit: 5, extra: undefined });
    const keyB = buildCacheKey('/search/', { query: 'hello', lang: 'en', limit: 5 });
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
    const params = { query: 'hello', lang: 'en', limit: 5, page: 1, sort: 'relevance' };
    const data = { results: [{ title: 'Hello World', url: 'https://example.com' }] };
    const url = 'https://api.example.com/search/?query=hello&lang=en&limit=5';

    writeCache(endpoint, params, data, url);
    const cached = readCache(endpoint, params);

    expect(cached).not.toBeNull();
    expect(cached!.data).toEqual(data);
    expect(cached!.url).toBe(url);
  });

  test('returns null on cache miss (no file)', () => {
    const cached = readCache('/search/', { query: 'hello', lang: 'en', limit: 5 });
    expect(cached).toBeNull();
  });

  test('returns null and removes file when cache entry is corrupted JSON', () => {
    const endpoint = '/search/';
    const params = { query: 'hello', lang: 'en', limit: 5, page: 1, sort: 'relevance' };

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
    const params = { query: 'hello', lang: 'en', limit: 5, page: 1, sort: 'relevance' };

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
