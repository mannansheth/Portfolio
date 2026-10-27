import { setTimeout as delay } from 'node:timers/promises';

const transientStatuses = new Set([500, 502, 503, 504]);

export async function requestGemini(url, options, timing = {}) {
  const sleep = timing.sleep || delay;
  const now = timing.now || Date.now;
  const random = timing.random || Math.random;
  const deadline = Math.min(timing.deadline ?? Infinity, now() + 90000);

  for (let attempt = 0; attempt < 3; attempt++) {
    const remaining = deadline - now();
    if (remaining <= 0) throw new Error('Gemini retry deadline exceeded.');
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(Math.min(60000, remaining)),
    });
    if (!transientStatuses.has(response.status) || attempt === 2) return response;

    const retryAfter = response.headers.get('retry-after');
    let waitMs = 1000 * 2 ** attempt + Math.floor(random() * 500);
    if (retryAfter) {
      const seconds = Number(retryAfter);
      const providerWait = Number.isFinite(seconds)
        ? seconds * 1000
        : Date.parse(retryAfter) - now();
      if (Number.isFinite(providerWait)) waitMs = Math.max(waitMs, providerWait);
    }
    // Do not retry earlier than a long provider-specified wait or exceed the request budget.
    if (waitMs > 10000 || now() + waitMs >= deadline) return response;
    await response.body?.cancel();
    await sleep(waitMs);
  }
}
