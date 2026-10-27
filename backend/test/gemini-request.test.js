import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestGemini } from '../src/gemini-request.js';

test('Gemini retries transient failures with backoff and preserves the request', async () => {
  const original = globalThis.fetch,
    waits = [],
    calls = [];
  const statuses = [503, 502, 200];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: options.body });
    return new Response('{}', { status: statuses[calls.length - 1] });
  };
  try {
    const response = await requestGemini(
      'https://example.com/generate',
      { method: 'POST', body: 'same evidence' },
      { sleep: async (ms) => waits.push(ms), random: () => 0 },
    );
    assert.equal(response.status, 200);
    assert.deepEqual(waits, [1000, 2000]);
    assert.equal(calls.length, 3);
    assert.ok(calls.every((call) => call.body === 'same evidence'));
  } finally {
    globalThis.fetch = original;
  }
});

test('Gemini retries are bounded, respect Retry-After, and skip permanent errors', async () => {
  const original = globalThis.fetch;
  try {
    let calls = 0;
    const waits = [];
    globalThis.fetch = async () => {
      calls++;
      return new Response('{}', { status: 503, headers: { 'Retry-After': '3' } });
    };
    const timing = { sleep: async (ms) => waits.push(ms), random: () => 0 };
    assert.equal((await requestGemini('https://example.com', {}, timing)).status, 503);
    assert.equal(calls, 3);
    assert.deepEqual(waits, [3000, 3000]);
    for (const status of [400, 401, 403, 404, 429]) {
      calls = 0;
      globalThis.fetch = async () => {
        calls++;
        return new Response('{}', { status });
      };
      assert.equal((await requestGemini('https://example.com', {}, timing)).status, status);
      assert.equal(calls, 1);
    }
    calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return new Response('{}', { status: 503, headers: { 'Retry-After': '120' } });
    };
    assert.equal((await requestGemini('https://example.com', {}, timing)).status, 503);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});
