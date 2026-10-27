import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateDraft } from '../src/ai.js';

const validDraft = {
  title: 'Wordle',
  tagline: '',
  overview: '',
  problem: '',
  outcomes: '',
  architecture: '',
  challenges: '',
  learnings: '',
  features: ['Verified feature'],
  technologies: [],
  connections: [],
  suggestedSections: [],
  missingInformation: [],
  claimEvidence: [{ section: 'features', claim: 'Verified feature', sources: ['README.md'] }],
};

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
    files: [{ path: 'README.md', text: 'Wordle' }],
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
                      { text: JSON.stringify(validDraft) },
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
