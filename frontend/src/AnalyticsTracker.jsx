import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackAnalytics } from './analytics.js';

export default function AnalyticsTracker({ enabled }) {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!enabled || pathname.startsWith('/admin')) return undefined;
    const projectSlug = pathname.match(/^\/work\/([^/]+)$/)?.[1];
    trackAnalytics('page_view', projectSlug ? { projectSlug } : {});

    const impressed = new Set();
    const observed = new WeakSet();
    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const slug = entry.target.dataset.analyticsProject;
            if (slug && !impressed.has(slug)) {
              impressed.add(slug);
              trackAnalytics('project_impression', { projectSlug: slug });
            }
          });
        }, { threshold: 0.45 })
      : null;
    const watchCards = (root) => {
      if (root.matches?.('[data-analytics-project]') && !observed.has(root)) {
        observed.add(root);
        observer?.observe(root);
      }
      root.querySelectorAll?.('[data-analytics-project]').forEach((card) => {
        if (observed.has(card)) return;
        observed.add(card);
        observer?.observe(card);
      });
    };
    watchCards(document);
    const mutations = 'MutationObserver' in window
      ? new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) watchCards(node);
        })))
      : null;
    mutations?.observe(document.getElementById('main-content') || document.body, { childList: true, subtree: true });

    let visibleSeconds = 0;
    let maximumScroll = 0;
    let lastTick = Date.now();
    let active = !document.hidden;
    const thresholds = new Set();
    const updateScroll = () => {
      const root = document.documentElement;
      const available = root.scrollHeight - window.innerHeight;
      maximumScroll = Math.max(
        maximumScroll,
        available > 0 ? Math.round((window.scrollY / available) * 100) : 0,
      );
      [25, 50, 75, 90].forEach((threshold) => {
        if (maximumScroll >= threshold && !thresholds.has(threshold)) {
          thresholds.add(threshold);
          trackAnalytics('scroll_depth', { scrollPercent: threshold, ...(projectSlug ? { projectSlug } : {}) });
        }
      });
    };
    const visibility = () => {
      const now = Date.now();
      if (active) visibleSeconds += Math.max(0, (now - lastTick) / 1000);
      active = !document.hidden;
      lastTick = now;
    };
    const timer = window.setInterval(() => {
      visibility();
      updateScroll();
      if (visibleSeconds >= 10) {
        trackAnalytics('page_engagement', {
          activeSeconds: Math.min(3600, Math.round(visibleSeconds)),
          scrollPercent: maximumScroll,
          ...(projectSlug ? { projectSlug } : {}),
        });
        window.clearInterval(timer);
      }
    }, 1000);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('scroll', updateScroll, { passive: true });
    const initialScrollFrame = requestAnimationFrame(updateScroll);
    return () => {
      cancelAnimationFrame(initialScrollFrame);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('scroll', updateScroll);
      mutations?.disconnect();
      observer?.disconnect();
    };
  }, [enabled, pathname]);

  return null;
}
