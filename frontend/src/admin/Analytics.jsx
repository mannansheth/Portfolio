import { useEffect, useMemo, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-110m.json';
import isoCountries from 'i18n-iso-countries';
import { api } from '../api.js';

const ranges = [7, 30, 90, 365];
const number = (value) => Number(value || 0).toLocaleString();
const eventLabels = {
  page_view: 'Viewed a page',
  page_engagement: 'Stayed and explored',
  scroll_depth: 'Scrolled through page',
  project_impression: 'Saw a project',
  project_open: 'Opened a project',
  project_select: 'Selected a project',
  project_filter: 'Changed project filter',
  cover_reveal: 'Used pixel reveal',
  outbound_click: 'Opened an external link',
  resume_download: 'Downloaded the resume',
  contact_submit: 'Submitted the contact form',
};
const worldFeatures = feature(world, world.objects.countries).features;

function eventData(event) {
  if (event.data && typeof event.data === 'object') return event.data;
  try { return JSON.parse(event.data || '{}'); } catch { return {}; }
}

function Metric({ label, value, detail }) {
  return <article className="analytics-metric"><span>{label}</span><strong>{number(value)}</strong><small>{detail}</small></article>;
}

function Panel({ title, detail, children, className = '' }) {
  return <section className={`analytics-panel ${className}`}><div className="analytics-panel-heading"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div></div>{children}</section>;
}

function RankedList({ title, rows, valueKey, valueLabel, empty }) {
  const maximum = Math.max(1, ...rows.map((row) => Number(row[valueKey] || 0)));
  return <Panel title={title} detail={valueLabel}>
    {rows.length ? <ol className="analytics-ranked-list">{rows.map((row, index) => {
      const label = row.path || row.source || row.value || row.device || row.browser || row.os || row.country || 'Unknown';
      const value = Number(row[valueKey] || 0);
      return <li key={`${label}-${index}`}><div className="analytics-ranked-copy"><span title={label}>{label}</span><strong>{number(value)}</strong></div><div className="analytics-track" aria-hidden="true"><span style={{ width: `${Math.max(3, value / maximum * 100)}%` }} /></div></li>;
    })}</ol> : <p className="analytics-empty">{empty}</p>}
  </Panel>;
}

function WorldMap({ locations }) {
  const { projection, path } = useMemo(() => {
    const projection = geoNaturalEarth1().fitSize([760, 350], { type: 'FeatureCollection', features: worldFeatures });
    return { projection, path: geoPath(projection) };
  }, []);
  const countries = useMemo(() => {
    const grouped = new Map();
    locations.forEach((row) => {
      if (!row.countryCode) return;
      const numericCode = isoCountries.alpha2ToNumeric(row.countryCode);
      if (!numericCode) return;
      const key = String(numericCode).padStart(3, '0');
      const current = grouped.get(key) || { country: row.country, sessions: 0 };
      current.sessions += Number(row.sessions || 0);
      grouped.set(key, current);
    });
    return grouped;
  }, [locations]);
  const max = Math.max(1, ...[...countries.values()].map((item) => item.sessions));
  return <div className="analytics-map-wrap">
    <svg className="analytics-world-map" viewBox="0 0 760 350" role="img" aria-label="World map shaded by visitor sessions">
      {worldFeatures.map((country) => {
        const stats = countries.get(String(country.id).padStart(3, '0'));
        const intensity = stats ? Math.max(.2, stats.sessions / max) : 0;
        return <path key={country.id} d={path(country)} className="analytics-map-country" style={{ '--map-intensity': intensity, '--map-fill': `${10 + intensity * 80}%` }}><title>{stats ? `${stats.country}: ${number(stats.sessions)} sessions` : country.properties?.name || 'No visitor data'}</title></path>;
      })}
    </svg>
    {!countries.size && <div className="analytics-map-empty">Location estimates will appear when the local GeoIP database is configured and real visitors arrive.</div>}
  </div>;
}

function eventSummary(event) {
  const data = eventData(event);
  if (event.type === 'project_filter') return `${eventLabels[event.type]}: ${data.value || 'filter'}`;
  if (event.type === 'scroll_depth') return `Scrolled to ${data.scrollPercent || 0}%`;
  if (event.type === 'page_engagement') return `Spent about ${data.activeSeconds || 0}s on ${event.path}`;
  if (event.type === 'outbound_click') return `${eventLabels[event.type]}: ${data.value || 'link'}`;
  if (event.projectSlug) return `${eventLabels[event.type] || event.type}: ${event.projectSlug}`;
  return eventLabels[event.type] || event.type;
}

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api(`/admin/analytics?days=${days}`)
      .then((result) => active && setData(result))
      .catch((reason) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [days, refreshKey]);

  const trend = useMemo(() => {
    const byDay = new Map((data?.daily || []).map((item) => [item.day, item]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - days + index + 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return byDay.get(key) || { day: key, pageViews: 0, sessions: 0 };
    });
  }, [data, days]);
  const maxViews = Math.max(1, ...trend.map((item) => Number(item.pageViews || 0)));
  const projectRows = (data?.projects || []).map((project) => ({ ...project, popularity: Number(project.detailViews || 0) + Number(project.opens || 0) + Number(project.selections || 0) }));
  const about = (data?.pages || []).find((page) => page.path === '/about');
  const interactionMap = new Map((data?.interactions || []).map((item) => [item.type, item]));

  return <section className="analytics-view" aria-labelledby="analytics-title">
    <div className="analytics-title-row">
      <div><p className="eyebrow">AUDIENCE / FIRST-PARTY</p><h1 id="analytics-title">Portfolio analytics.</h1><p className="analytics-intro">See which pages people visit, which projects they explore, and how they use the portfolio. Visitor IDs are random and pseudonymous; location is an estimate from IP, not a precise address.</p></div>
      <div className="analytics-controls"><label className="analytics-range"><span>Period</span><select value={days} onChange={(event) => setDays(Number(event.target.value))}>{ranges.map((range) => <option key={range} value={range}>Last {range} days</option>)}</select></label><button className="analytics-refresh" type="button" onClick={() => setRefreshKey((value) => value + 1)}>Refresh data</button></div>
    </div>
    {error && <p className="analytics-error" role="alert">{error}</p>}
    {loading && !data ? <p className="analytics-empty" role="status">Loading analytics…</p> : data ? <>
      <div className="analytics-metrics">
        <Metric label="Unique browsers" value={data.summary.visitors} detail="Random first-party browser IDs" />
        <Metric label="Sessions" value={data.summary.sessions} detail="Tabs with activity" />
        <Metric label="Page views" value={data.summary.pageViews} detail={`Across the last ${days} days`} />
        <Metric label="Engaged pages" value={data.summary.engagedPages} detail="Visible for 10+ active seconds" />
        <Metric label="Cover reveals" value={data.summary.coverReveals} detail="Pixel reveal used at least once" />
      </div>

      <Panel title="Traffic over time" detail="Daily page views and sessions" className="analytics-trend">
        {Number(data.summary.pageViews) ? <div className="analytics-chart" role="img" aria-label={`Daily page views and sessions for the last ${days} days`}>
          {trend.map((day) => {
            const views = Number(day.pageViews || 0);
            const sessions = Number(day.sessions || 0);
            return <div className="analytics-day" key={day.day} title={`${day.day}: ${number(views)} views, ${number(sessions)} sessions`}><span className="analytics-day-bars"><i className="analytics-bar" style={{ height: `${Math.max(2, views / maxViews * 100)}%` }} /><i className="analytics-bar analytics-bar-sessions" style={{ height: `${Math.max(2, sessions / maxViews * 100)}%` }} /></span><small>{days > 90 ? day.day.slice(5, 7) : day.day.slice(5)}</small></div>;
          })}
        </div> : <p className="analytics-empty">Traffic will appear after the database migration and the first visitor.</p>}
      </Panel>

      <div className="analytics-columns analytics-projects-pages">
        <Panel title="Projects people explore" detail="Impressions, selections, open clicks, detail views, and engaged sessions">
          {projectRows.length ? <div className="analytics-project-table"><div className="analytics-table-head"><span>Project</span><span>Seen</span><span>Selected</span><span>Opened</span><span>Details</span><span>Read</span></div>{projectRows.map((row) => <div className="analytics-table-row" key={row.slug}><strong>{row.slug}</strong><span>{number(row.impressions)}</span><span>{number(row.selections)}</span><span>{number(row.opens)}</span><span>{number(row.detailViews)}</span><span>{number(row.engagedSessions)}</span></div>)}</div> : <p className="analytics-empty">Project engagement appears after visitors browse the work map.</p>}
        </Panel>
        <Panel title="Pages and reading signals" detail="A read signal means 10+ visible seconds; it is an estimate.">
          {data.pages.length ? <ol className="analytics-page-table">{data.pages.map((page) => <li key={page.path}><span>{page.path === '/' ? 'Home' : page.path}</span><strong>{number(page.views)} views</strong><small>{number(page.engaged)} engaged sessions</small></li>)}</ol> : <p className="analytics-empty">Page engagement will appear here.</p>}
          <div className="analytics-about-callout"><span>ABOUT PAGE READ SIGNAL</span><strong>{number(about?.engaged || 0)}</strong><small>sessions with 10+ active seconds</small></div>
        </Panel>
      </div>

      <div className="analytics-columns analytics-location-row">
        <Panel title="Visitor locations" detail={data.geolocationEnabled ? 'Approximate IP-based estimates' : 'GeoIP database not configured'} className="analytics-location-panel">
          <WorldMap locations={data.locations || []} />
          <ol className="analytics-ranked-list analytics-location-list">{(data.locations || []).filter((row) => row.countryCode).slice(0, 8).map((row, index) => <li key={`${row.countryCode}-${row.region}-${row.city}-${index}`}><div className="analytics-ranked-copy"><span>{[row.city, row.region, row.country].filter(Boolean).join(', ')}</span><strong>{number(row.sessions)}</strong></div></li>)}</ol>
        </Panel>
        <div className="analytics-breakdowns">
          <RankedList title="Devices" rows={data.devices || []} valueKey="sessions" valueLabel="Sessions" empty="Device details appear after visits." />
          <RankedList title="Browsers" rows={data.browsers || []} valueKey="sessions" valueLabel="Sessions" empty="Browser details appear after visits." />
          <RankedList title="Operating systems" rows={data.operatingSystems || []} valueKey="sessions" valueLabel="Sessions" empty="Operating-system details appear after visits." />
          <RankedList title="Referrer sites" rows={data.sources || []} valueKey="sessions" valueLabel="Sessions" empty="Referrers appear after visits from other sites." />
        </div>
      </div>

      <div className="analytics-columns">
        <Panel title="Portfolio interactions" detail="Count of deliberate interactions">
          <div className="analytics-interaction-grid">
            {[
              ['Pixel cover reveals', 'cover_reveal'], ['Project filters', 'project_filter'],
              ['Project opens', 'project_open'], ['Resume downloads', 'resume_download'],
              ['Contact form sends', 'contact_submit'], ['External link clicks', 'outbound_click'],
            ].map(([label, key]) => <div key={key}><span>{label}</span><strong>{number(interactionMap.get(key)?.count)}</strong><small>{number(interactionMap.get(key)?.sessions)} sessions</small></div>)}
          </div>
          {(data.filters || []).length > 0 && <div className="analytics-filter-list"><strong>Most-used project filters</strong>{data.filters.map((filter) => <span key={filter.value}>{filter.value}: {number(filter.uses)}</span>)}</div>}
          {(data.scrolls || []).length > 0 && <div className="analytics-filter-list"><strong>Scroll depth thresholds reached</strong>{data.scrolls.map((item) => <span key={item.value}>{item.value}%: {number(item.sessions)} sessions</span>)}</div>}
        </Panel>
        <Panel title="Recent visitor activity" detail="Pseudonymous sessions; content of forms is never included">
          {data.events?.length ? <details className="analytics-activity-disclosure"><summary>Show recent events ({Math.min(data.events.length, 30)})</summary><ol className="analytics-activity">{data.events.slice(0, 30).map((event, index) => <li key={`${event.sessionId}-${event.createdAt}-${index}`}><div className="analytics-activity-top"><strong>{eventSummary(event)}</strong><time>{new Date(event.createdAt).toLocaleString()}</time></div><p><span>{event.city && event.country ? `${event.city}, ${event.country}` : event.country || 'Location unavailable'}</span><span>{event.device} · {event.browser} · {event.os}</span><span>Visitor {event.visitorId?.slice(0, 8)} / session {event.sessionId?.slice(0, 8)}</span><span>{number(event.pageViews)} page views · Entry: {event.entryPath} · Exit: {event.exitPath}</span><span>Source: {event.referrer || 'Direct / unknown'}</span></p></li>)}</ol></details> : <p className="analytics-empty">Recent activity appears as new visits arrive.</p>}
        </Panel>
      </div>
      <p className="analytics-footnote">Visitor IDs are random values stored in this browser to distinguish repeat visits. No names, form contents, or raw IP addresses are stored in the analytics database. IP-based location is approximate and can be wrong, especially with VPNs or mobile networks. Records are retained for {number(data.retentionDays)} days.</p>
    </> : null}
  </section>;
}
