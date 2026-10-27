import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateDraft } from '../src/ai.js';

test('configured Gemini fallback recovers temporary errors without bypassing access or quota errors', async () => {
  const original = globalThis.fetch;
  const saved = Object.fromEntries(
    ['GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_FALLBACK_MODEL'].map((key) => [
      key,
      process.env[key],
    ]),
  );
  Object.assign(process.env, {
    GEMINI_API_KEY: 'test-placeholder',
    GEMINI_MODEL: 'primary-model',
    GEMINI_FALLBACK_MODEL: 'fallback-model',
  });
  const calls = [];
  const evidence = {
    repo: 'Wordle',
    owner: 'example',
    url: 'https://github.com/example/wordle',
    homepage: '',
    files: [],
  };
  try {
    globalThis.fetch = async (url) => {
      calls.push(url);
      return url.includes('primary-model')
        ? new Response('{}', { status: 503, headers: { 'Retry-After': '120' } })
        : new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [
                      { text: JSON.stringify({ title: 'Wordle', features: ['Verified feature'] }) },
                    ],
                  },
                },
              ],
            }),
          );
    };
    const result = await generateDraft(evidence);
    assert.equal(calls.length, 2);
    assert.equal(result.status, 'draft');
    assert.equal(result.generationModel, 'fallback-model');
    for (const status of [400, 401, 403, 404, 429]) {
      calls.length = 0;
      globalThis.fetch = async (url) => {
        calls.push(url);
        return new Response('{}', { status });
      };
      await assert.rejects(generateDraft(evidence));
      assert.equal(calls.length, 1);
    }
  } finally {
    globalThis.fetch = original;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
