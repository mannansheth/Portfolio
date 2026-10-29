import fs from 'node:fs';
import maxmind from 'maxmind';
import { pool, query } from './db.js';

const requestedRetention = Number(process.env.ANALYTICS_RETENTION_DAYS || 180);
const retentionDays = Number.isFinite(requestedRetention) ? Math.min(365, Math.max(30, requestedRetention)) : 180;
const geoPath = process.env.GEOIP_DB_PATH || '/opt/geoip/GeoLite2-City.mmdb';
let geoReaderPromise;
let lastPrune = 0;

function normalizeIp(value = '') {
  const candidate = String(value).split(',')[0].trim().replace(/^::ffff:/i, '');
  return candidate;
}

function privateIp(ip) {
  return !ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('10.') || ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:');
}

function loadGeoReader() {
  geoReaderPromise ||= fs.promises.access(geoPath).then(() => maxmind.open(geoPath)).catch(() => null);
  return geoReaderPromise;
}

async function locationFor(ip) {
  if (privateIp(ip)) return {};
  const reader = await loadGeoReader();
  if (!reader) return {};
  const result = reader.get(ip);
  if (!result) return {};
  return {
    country_code: result.country?.iso_code || result.registered_country?.iso_code || null,
    country: result.country?.names?.en || result.registered_country?.names?.en || null,
    region: result.subdivisions?.[0]?.names?.en || null,
    city: result.city?.names?.en || null,
  };
}

function browserDetails(userAgent = '') {
  const ua = userAgent.toLowerCase();
  let browser = 'Other';
  if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('opr/') || ua.includes('opera')) browser = 'Opera';
  else if (ua.includes('firefox/')) browser = 'Firefox';
  else if (ua.includes('chrome/') || ua.includes('crios/')) browser = 'Chrome';
  else if (ua.includes('safari/')) browser = 'Safari';
  let os = 'Other';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) os = 'iOS';
  else if (ua.includes('mac os') || ua.includes('macintosh')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  const device = /mobile|iphone|android/.test(ua) ? 'Mobile' : /ipad|tablet/.test(ua) ? 'Tablet' : 'Desktop';
  return { browser, os, device };
}

function safeReferrer(value) {
  if (!value) return null;
  try {
    const host = (value.includes('://') ? new URL(value).hostname : value).toLowerCase();
    return host.length <= 253 ? host : null;
  } catch {
    return null;
  }
}

function isLikelyBot(userAgent = '') {
  return /bot|crawler|spider|slurp|headless|lighthouse|pagespeed|preview/i.test(userAgent);
}

const prune = async () => {
  if (Date.now() - lastPrune < 24 * 60 * 60 * 1000) return;
  lastPrune = Date.now();
  await query('DELETE FROM analytics_event_log WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)', [retentionDays]);
  await query('DELETE FROM analytics_sessions WHERE last_seen < DATE_SUB(NOW(), INTERVAL ? DAY)', [retentionDays]);
  await query('DELETE FROM analytics_visitors WHERE last_seen < DATE_SUB(NOW(), INTERVAL ? DAY)', [retentionDays]);
};

export async function recordAnalyticsEvent(event, req) {
  const userAgent = req.get('user-agent') || '';
  if (isLikelyBot(userAgent)) return;
  const ip = normalizeIp(req.ip || req.socket?.remoteAddress || '');
  const [geo, agent] = await Promise.all([locationFor(ip), Promise.resolve(browserDetails(userAgent))]);
  const referrerHost = safeReferrer(event.referrerHost);
  const visitorId = event.visitorId;
  const sessionId = event.sessionId;
  const projectSlug = event.data?.projectSlug || null;
  const encodedData = JSON.stringify(event.data || {});
    const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO analytics_visitors (visitor_id,first_seen,last_seen)
       VALUES (?,NOW(),NOW()) ON DUPLICATE KEY UPDATE last_seen=NOW()`,
      [visitorId],
    );
    await connection.execute(
      `INSERT INTO analytics_sessions (session_id,visitor_id,started_at,last_seen,entry_path,exit_path,referrer_host,page_views,country_code,country,region,city,device_type,browser,operating_system)
       VALUES (?,?,NOW(),NOW(),?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE last_seen=NOW(),exit_path=VALUES(exit_path),page_views=page_views+VALUES(page_views),country_code=COALESCE(VALUES(country_code),country_code),country=COALESCE(VALUES(country),country),region=COALESCE(VALUES(region),region),city=COALESCE(VALUES(city),city)`,
      [sessionId, visitorId, event.path, event.path, referrerHost, event.type === 'page_view' ? 1 : 0, geo.country_code || null, geo.country || null, geo.region || null, geo.city || null, agent.device, agent.browser, agent.os],
    );
    await connection.execute(
      `INSERT INTO analytics_event_log (visitor_id,session_id,event_type,page_path,project_slug,event_data,created_at)
       VALUES (?,?,?,?,?,?,NOW())`,
      [visitorId, sessionId, event.type, event.path, projectSlug, encodedData],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  void prune().catch(() => {});
}

export async function getAnalyticsReport(days) {
  const interval = `created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`;
  const sessionInterval = `started_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`;
  const [summaryRows, daily, pages, projects, locations, devices, browsers, operatingSystems, sources, filters, scrolls, interactions, events] = await Promise.all([
    query(`SELECT (SELECT COUNT(*) FROM analytics_event_log WHERE event_type='page_view' AND ${interval}) AS pageViews,
      (SELECT COUNT(*) FROM analytics_sessions WHERE ${sessionInterval}) AS sessions,
      (SELECT COUNT(DISTINCT visitor_id) FROM analytics_sessions WHERE ${sessionInterval}) AS visitors,
      (SELECT COUNT(*) FROM analytics_event_log WHERE event_type='page_engagement' AND ${interval}) AS engagedPages,
      (SELECT COUNT(*) FROM analytics_event_log WHERE event_type='cover_reveal' AND ${interval}) AS coverReveals`),
    query(`SELECT DATE_FORMAT(created_at,'%Y-%m-%d') AS day, COUNT(*) AS pageViews, COUNT(DISTINCT session_id) AS sessions FROM analytics_event_log WHERE event_type='page_view' AND ${interval} GROUP BY DATE(created_at) ORDER BY DATE(created_at)`),
    query(`SELECT page_path AS path, SUM(event_type='page_view') AS views, COUNT(DISTINCT session_id) AS sessions, COUNT(DISTINCT CASE WHEN event_type='page_engagement' THEN session_id END) AS engaged FROM analytics_event_log WHERE event_type IN ('page_view','page_engagement') AND ${interval} GROUP BY page_path ORDER BY views DESC LIMIT 12`),
    query(`SELECT project_slug AS slug, SUM(event_type='project_impression') AS impressions, SUM(event_type='project_open') AS opens, SUM(event_type='project_select') AS selections, SUM(event_type='page_view') AS detailViews, COUNT(DISTINCT CASE WHEN event_type='page_engagement' THEN session_id END) AS engagedSessions FROM analytics_event_log WHERE project_slug IS NOT NULL AND ${interval} GROUP BY project_slug ORDER BY (detailViews + opens + selections) DESC LIMIT 12`),
    query(`SELECT s.country_code AS countryCode, COALESCE(s.country,'Unknown location') AS country, s.region, s.city, COUNT(DISTINCT s.session_id) AS sessions FROM analytics_sessions s WHERE ${sessionInterval} GROUP BY s.country_code,s.country,s.region,s.city ORDER BY sessions DESC LIMIT 100`),
    query(`SELECT s.device_type AS device, COUNT(*) AS sessions FROM analytics_sessions s WHERE ${sessionInterval} GROUP BY s.device_type ORDER BY sessions DESC`),
    query(`SELECT s.browser, COUNT(*) AS sessions FROM analytics_sessions s WHERE ${sessionInterval} GROUP BY s.browser ORDER BY sessions DESC LIMIT 8`),
    query(`SELECT s.operating_system AS os, COUNT(*) AS sessions FROM analytics_sessions s WHERE ${sessionInterval} GROUP BY s.operating_system ORDER BY sessions DESC LIMIT 8`),
    query(`SELECT COALESCE(s.referrer_host,'Direct / unknown') AS source, COUNT(*) AS sessions FROM analytics_sessions s WHERE ${sessionInterval} GROUP BY s.referrer_host ORDER BY sessions DESC LIMIT 10`),
    query(`SELECT JSON_UNQUOTE(JSON_EXTRACT(event_data,'$.value')) AS value, COUNT(*) AS uses FROM analytics_event_log WHERE event_type='project_filter' AND ${interval} GROUP BY value ORDER BY uses DESC LIMIT 10`),
    query(`SELECT JSON_UNQUOTE(JSON_EXTRACT(event_data,'$.scrollPercent')) AS value, COUNT(*) AS events, COUNT(DISTINCT session_id) AS sessions FROM analytics_event_log WHERE event_type='scroll_depth' AND ${interval} GROUP BY value ORDER BY CAST(value AS UNSIGNED)`),
    query(`SELECT event_type AS type, COUNT(*) AS count, COUNT(DISTINCT session_id) AS sessions FROM analytics_event_log WHERE event_type NOT IN ('page_view','page_engagement') AND ${interval} GROUP BY event_type ORDER BY count DESC`),
    query(`SELECT e.event_type AS type,e.page_path AS path,e.project_slug AS projectSlug,e.event_data AS data,e.created_at AS createdAt,s.session_id AS sessionId,s.visitor_id AS visitorId,s.entry_path AS entryPath,s.exit_path AS exitPath,s.page_views AS pageViews,s.referrer_host AS referrer,s.country AS country,s.city AS city,s.region AS region,s.device_type AS device,s.browser AS browser,s.operating_system AS os FROM analytics_event_log e JOIN analytics_sessions s ON s.session_id=e.session_id WHERE e.created_at >= DATE_SUB(NOW(), INTERVAL ${Math.min(days, 7)} DAY) ORDER BY e.id DESC LIMIT 120`),
  ]);
  const [summary] = summaryRows;
  const geoReady = Boolean(await loadGeoReader());
  return { days, retentionDays, summary, daily, pages, projects, locations, devices, browsers, operatingSystems, sources, filters, scrolls, interactions, events, geolocationEnabled: geoReady };
}
