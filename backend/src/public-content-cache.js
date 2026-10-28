import { query } from './db.js';
import { HttpError } from './validation.js';
import { json, listProjects } from './projects.js';

let snapshot = null;
let dirty = true;
let requiresFreshSnapshot = false;
let revision = 0;
let refreshPromise = null;
let retryAt = 0;
let lastError = null;

async function loadSnapshot() {
  const [profileRows, projects] = await Promise.all([
    query('SELECT * FROM profile WHERE id=1'),
    listProjects(true),
  ]);
  if (!profileRows.length)
    throw new HttpError(503, 'Portfolio content has not been initialized. Run setup.');

  return {
    profile: { ...json(profileRows[0].data), version: profileRows[0].version },
    projects,
    projectsBySlug: new Map(projects.map((project) => [project.slug, project])),
  };
}

export async function refreshPublicContentCache() {
  if (refreshPromise) return refreshPromise;
  const startedAtRevision = revision;

  refreshPromise = (async () => {
    try {
      const nextSnapshot = await loadSnapshot();
      snapshot = nextSnapshot;
      dirty = revision !== startedAtRevision;
      if (!dirty) requiresFreshSnapshot = false;
      retryAt = 0;
      lastError = null;
      return true;
    } catch (error) {
      dirty = true;
      retryAt = Date.now() + 5000;
      lastError = error;
      if (!snapshot) throw error;
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function refreshAfterPublicWrite() {
  revision += 1;
  dirty = true;
  requiresFreshSnapshot = true;
  retryAt = 0;
  try {
    await refreshPublicContentCache();
  } catch {
    // The write already succeeded. Keep the prior snapshot and retry on a later public read.
    console.warn('Public content cache refresh failed; keeping its last known-good snapshot.');
  }
}

export async function getPublicProfile() {
  if (dirty && Date.now() >= retryAt) await refreshPublicContentCache();
  if (requiresFreshSnapshot)
    throw new HttpError(503, 'Published content is refreshing. Please retry shortly.');
  if (!snapshot) throw lastError || new HttpError(503, 'Portfolio content is unavailable.');
  return snapshot.profile;
}

export async function getPublicProjects() {
  if (dirty && Date.now() >= retryAt) await refreshPublicContentCache();
  if (requiresFreshSnapshot)
    throw new HttpError(503, 'Published content is refreshing. Please retry shortly.');
  if (!snapshot) throw lastError || new HttpError(503, 'Portfolio content is unavailable.');
  return snapshot.projects;
}

export async function getPublicProject(slug) {
  if (dirty && Date.now() >= retryAt) await refreshPublicContentCache();
  if (requiresFreshSnapshot)
    throw new HttpError(503, 'Published content is refreshing. Please retry shortly.');
  if (!snapshot) throw lastError || new HttpError(503, 'Portfolio content is unavailable.');
  return snapshot.projectsBySlug.get(slug) || null;
}
