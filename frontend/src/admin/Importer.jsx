import { useState } from 'react';
import { api } from '../api.js';
import { Field, Feedback, External, Tags } from '../components.jsx';
import { emptyProject } from './ProjectEditor.jsx';
export default function Importer({ onDraft, onExisting }) {
  const [repositories, setRepositories] = useState([]),
    [loaded, setLoaded] = useState(false),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all'),
    [source, setSource] = useState('public'),
    [allowPrivateSource, setAllowPrivateSource] = useState(false),
    [url, setUrl] = useState(''),
    [evidence, setEvidence] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function browse(selectedSource = source) {
    setBusy(true);
    setError('');
    try {
      const result = await api(`/admin/github/repositories?source=${selectedSource}`);
      setSource(selectedSource);
      setRepositories(result.repositories);
      setLoaded(true);
      if (!result.complete)
        setError('Showing the first 1,000 repositories. Import another repository by URL.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function inspect(value = url) {
    setBusy(true);
    setError('');
    setEvidence(null);
    setAllowPrivateSource(false);
    setUrl(value);
    try {
      setEvidence(
        await api('/admin/github/inspect', {
          method: 'POST',
          body: { url: value },
        }),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    setBusy(true);
    setError('');
    try {
      onDraft(
        await api('/admin/github/generate', {
          method: 'POST',
          body: { url: evidence.url, allowPrivateSource },
        }),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function metadata() {
    onDraft({
      ...emptyProject,
      title: evidence.repo,
      slug: evidence.repo
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      tagline: evidence.description.slice(0, 300),
      overview: evidence.description,
      technologies: evidence.languages,
      repositoryUrl: evidence.url,
      demoUrl: evidence.homepage,
      githubOwner: evidence.owner,
      githubRepo: evidence.repo,
      repositoryPrivate: evidence.private,
      missingInformation: [
        'Review source evidence and add project details, individual contribution, and lessons learned.',
      ],
    });
  }
  const shown = repositories.filter(
    (r) =>
      `${r.name} ${r.description} ${r.language}`.toLowerCase().includes(search.toLowerCase()) &&
      (filter === 'all' ||
        (filter === 'original' && !r.fork) ||
        (filter === 'new' && !r.importedId) ||
        (filter === 'private' && r.private) ||
        (filter === 'public' && !r.private)),
  );
  return (
    <div>
      <p className="eyebrow">REPOSITORY SOURCE → EDITABLE DRAFT</p>
      <h1>Import from GitHub.</h1>
      <p className="admin-intro">
        Inspect before you import. Generated descriptions always open as drafts for your review.
      </p>
      <Feedback error={error} />
      <div className="import-layout">
        <div>
          <div className="panel">
            <h2>Repository discovery</h2>
            <button className="button" disabled={busy} onClick={() => browse('public')}>
              {busy
                ? 'Working…'
                : loaded
                  ? 'Refresh repositories'
                  : 'Browse mannansheth’s repositories'}
            </button>
            <button disabled={busy} onClick={() => browse('accessible')}>
              Browse token-accessible repositories
            </button>
            <p className="form-note">
              {source === 'accessible'
                ? 'Showing repositories your GitHub token can access, including private repositories.'
                : 'Public discovery works without a token. Private access requires a server-side token with Contents read permission.'}
            </p>
            <div className="form-grid">
              <Field
                label="Search repositories"
                type="search"
                value={search}
                onChange={setSearch}
              />
              <label className="field">
                <span>Filter</span>
                <select
                  aria-label="Filter"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All repositories</option>
                  <option value="private">Private repositories</option>
                  <option value="public">Public repositories</option>
                  <option value="original">Original repositories</option>
                  <option value="new">Not imported yet</option>
                </select>
              </label>
            </div>
          </div>
          {loaded && (
            <p className="form-note">
              {shown.length} repositories · forks and archived projects are marked for review.
            </p>
          )}
          <div className="repo-list">
            {shown.map((r) => (
              <div className="repo-item" key={r.url}>
                <h3>{r.name}</h3>
                <small className="repo-owner">
                  {r.owner}/{r.name}
                </small>
                <p>{r.description || 'No repository description provided.'}</p>
                <p className="eyebrow">
                  {r.language || 'Language unavailable'}
                  {r.private ? ' / PRIVATE' : ' / PUBLIC'}
                  {r.fork ? ' / FORK' : ''}
                  {r.archived ? ' / ARCHIVED' : ''}
                  {r.importedId ? ' / ALREADY IMPORTED' : ''}
                </p>
                <div className="actions">
                  <button disabled={busy} onClick={() => inspect(r.url)}>
                    Inspect
                  </button>
                  {r.importedId && (
                    <button onClick={() => onExisting(r.importedId)}>Edit existing project</button>
                  )}
                </div>
              </div>
            ))}
            {loaded && !shown.length && <p>No repositories match these filters.</p>}
          </div>
        </div>
        <div>
          <form
            className="panel"
            onSubmit={(e) => {
              e.preventDefault();
              inspect();
            }}
          >
            <h2>Import a repository URL</h2>
            <Field
              label="Repository URL"
              type="url"
              required
              value={url}
              onChange={setUrl}
              placeholder="https://github.com/owner/repository"
            />
            <button disabled={busy}>{busy ? 'Inspecting…' : 'Inspect repository ↗'}</button>
          </form>
          {evidence && (
            <div className="panel evidence-panel">
              <p className="eyebrow">REPOSITORY INSPECTION</p>
              <h2>{evidence.repo}</h2>
              {evidence.private && (
                <div className="privacy-notice">
                  <strong>Private repository</strong>
                  <p>
                    Evidence is visible only in the admin. Importing saves a draft. Review
                    descriptions before making them public; the private repository link stays
                    hidden.
                  </p>
                </div>
              )}
              <p>
                {evidence.description ||
                  'No repository description. Add context manually or generate a source-based draft.'}
              </p>
              <Tags items={evidence.languages} />
              <External href={evidence.url}>View on GitHub ↗</External>
              {evidence.warnings.map((w, i) => (
                <p className="feedback error" key={i}>
                  {w}
                </p>
              ))}
              {evidence.treeTruncated && <p>GitHub returned a partial directory tree.</p>}
              <details>
                <summary>Directory structure ({evidence.structure.length} paths)</summary>
                <pre>{evidence.structure.join('\n')}</pre>
              </details>
              <details>
                <summary>Selected source evidence ({evidence.files.length} files)</summary>
                {evidence.files.map((f) => (
                  <div key={f.path}>
                    <h3>{f.path}</h3>
                    <pre>{f.text}</pre>
                  </div>
                ))}
              </details>
              <p className="form-note">
                Source is selectively retrieved and filtered. It cannot establish your personal
                contribution or project outcomes.
              </p>
              <div className="stack-actions">
                {evidence.importedId ? (
                  <>
                    <p>
                      This repository is already imported. Open the existing project to refresh
                      evidence or regenerate descriptions.
                    </p>
                    <button className="button" onClick={() => onExisting(evidence.importedId)}>
                      Edit existing project
                    </button>
                  </>
                ) : (
                  <>
                    {evidence.private && (
                      <label className="check-field">
                        <input
                          type="checkbox"
                          checked={allowPrivateSource}
                          onChange={(e) => setAllowPrivateSource(e.target.checked)}
                        />
                        Allow sending the selected private source evidence to Gemini
                      </label>
                    )}
                    <button
                      className="button"
                      disabled={busy || (evidence.private && !allowPrivateSource)}
                      onClick={generate}
                    >
                      {busy ? 'Generating…' : 'Generate draft with Gemini'}
                    </button>
                    <button disabled={busy} onClick={metadata}>
                      Use metadata & write manually
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
