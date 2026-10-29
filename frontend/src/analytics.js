const validEvents = new Set([
  'page_view',
  'page_engagement',
  'scroll_depth',
  'project_impression',
  'project_open',
  'project_select',
  'project_filter',
  'cover_reveal',
  'outbound_click',
  'resume_download',
  'contact_submit',
]);

function persistentId(storage, key) {
  try {
    let value = storage.getItem(key);
    if (!value) {
      if (globalThis.crypto?.randomUUID) value = globalThis.crypto.randomUUID();
      else if (globalThis.crypto?.getRandomValues) {
        const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
        value = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      } else value = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (letter) => {
        const byte = Math.random() * 16 | 0;
        return (letter === 'x' ? byte : (byte & 0x3) | 0x8).toString(16);
      });
      storage.setItem(key, value);
    }
    return value;
  } catch {
    return '';
  }
}

export function trackAnalytics(type, data = {}) {
  if (!validEvents.has(type) || window.location.pathname.startsWith('/admin')) return;
  const visitorId = persistentId(window.localStorage, 'portfolio-analytics-visitor');
  const sessionId = persistentId(window.sessionStorage, 'portfolio-analytics-session');
  if (!visitorId || !sessionId) return;
  const base = new URL(import.meta.env.BASE_URL, window.location.origin).pathname;
  const fullPath = window.location.pathname;
  const routePath = base !== '/' && fullPath.startsWith(base) ? `/${fullPath.slice(base.length)}` : fullPath;
  const path = `${routePath}${window.location.hash || ''}`.slice(0, 255);
  const referrerHost = (() => {
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      return referrer && referrer.origin !== window.location.origin ? referrer.hostname : undefined;
    } catch {
      return undefined;
    }
  })();
  const payload = {
    visitorId,
    sessionId,
    type,
    path: path.split('#')[0],
    ...(referrerHost ? { referrerHost } : {}),
    ...(Object.keys(data).length ? { data } : {}),
  };
  fetch(`${import.meta.env.BASE_URL}api/analytics/event`, {
    method: 'POST',
    credentials: 'omit',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
