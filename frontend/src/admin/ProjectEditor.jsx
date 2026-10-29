import { useState } from 'react';
import { api } from '../api.js';
import { Field, Feedback, ProjectDetail } from '../components.jsx';
export const emptyProject = {
  title: '',
  slug: '',
  tagline: '',
  overview: '',
  problem: '',
  outcomes: '',
  architecture: '',
  contribution: '',
  challenges: '',
  learnings: '',
  features: [],
  technologies: [],
  connections: [],
  sourcePaths: [],
  sourceWarnings: [],
  treeTruncated: false,
  claimEvidence: [],
  missingInformation: [],
  suggestedSections: [],
  coverImage: '',
  images: [],
  repositoryUrl: '',
  demoUrl: '',
  githubOwner: '',
  githubRepo: '',
  repositoryPrivate: false,
  privatePublicationApproved: false,
  status: 'draft',
  featured: false,
  position: 0,
};
const suggestedConnections = [
  'Useful workflows',
  'Interaction & feedback',
  'Learning under constraints',
];
export default function ProjectEditor({ initial, onSave, onCancel }) {
  const [project, setProject] = useState({ ...emptyProject, ...initial }),
    [preview, setPreview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [candidate, setCandidate] = useState(null),
    [evidence, setEvidence] = useState(null);
  const change = (key, value) => setProject((p) => ({ ...p, [key]: value }));
  const [allowPrivateSource, setAllowPrivateSource] = useState(false);
  const [customSlug, setCustomSlug] = useState(Boolean(initial.slug));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const saved = await api(project.id ? `/admin/projects/${project.id}` : '/admin/projects', {
        method: project.id ? 'PUT' : 'POST',
        body: project,
      });
      setProject(saved);
      setMessage(saved.status === 'draft' ? 'Draft saved.' : 'Project published.');
      onSave(saved);
    } catch (e) {
      setError(
        e.details
          ? `${e.message} ${e.details.map((d) => `${d.field}: ${d.message}`).join(' ')}`
          : e.message,
      );
    } finally {
      setBusy(false);
    }
  }
  async function regenerate() {
    setBusy(true);
    setError('');
    try {
      setCandidate(
        await api('/admin/github/generate', {
          method: 'POST',
          body: { url: project.repositoryUrl, allowPrivateSource },
        }),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    setBusy(true);
    setError('');
    try {
      const data = await api(`/admin/projects/${project.id}/refresh`, {
        method: 'POST',
        body: {},
      });
      setEvidence(data);
      if (data.publicationChanged) {
        setProject((p) => ({
          ...p,
          repositoryPrivate: true,
          privatePublicationApproved: false,
          status: 'draft',
          version: p.version + 1,
        }));
        onSave();
      }
      setMessage(
        data.publicationChanged
          ? 'Repository is now private. The project was moved to draft; review before republishing.'
          : 'Repository evidence refreshed. Your descriptions are preserved.',
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <div className="admin-title">
        <div>
          <p className="eyebrow">PROJECT EDITOR</p>
          <h1>{project.title || 'New project'}</h1>
        </div>
        <div className="actions">
          <button onClick={onCancel}>Back</button>
          <button onClick={() => setPreview(!preview)}>
            {preview ? 'Return to editor' : 'Preview'}
          </button>
        </div>
      </div>
      <Feedback error={error} message={message} />
      {candidate && (
        <div className="review-box">
          <h2>Generated draft ready for review</h2>
          <p>
            Applying this draft replaces the descriptive fields in this editor. Your contribution,
            images, links, and publication settings are preserved. Save separately after review.
          </p>
          <details>
            <summary>Read generated content</summary>
            <pre>{JSON.stringify(candidate, null, 2)}</pre>
          </details>
          <div className="actions">
            <button
              className="button"
              onClick={() => {
                const keys = [
                  'title',
                  'tagline',
                  'overview',
                  'problem',
                  'outcomes',
                  'features',
                  'technologies',
                  'architecture',
                  'challenges',
                  'learnings',
                  'missingInformation',
                  'suggestedSections',
                ];
                setProject((p) => ({
                  ...p,
                  ...Object.fromEntries(keys.map((k) => [k, candidate[k]])),
                  connections: p.connections?.length
                    ? p.connections
                    : (candidate.connections ?? []),
                  sourcePaths: candidate.sourcePaths ?? [],
                  sourceWarnings: candidate.sourceWarnings ?? [],
                  treeTruncated: candidate.treeTruncated ?? false,
                  claimEvidence: candidate.claimEvidence ?? [],
                }));
                setCandidate(null);
                setBusy(false);
                setMessage('Generated text applied to the editor. Review and save when ready.');
              }}
            >
              Replace descriptive fields
            </button>
            <button
              onClick={() => {
                setCandidate(null);
                setBusy(false);
              }}
            >
              Keep my text
            </button>
          </div>
        </div>
      )}
      {evidence && (
        <details className="review-box">
          <summary>Refreshed repository evidence</summary>
          <pre>{JSON.stringify(evidence, null, 2)}</pre>
        </details>
      )}
      {preview ? (
        <ProjectDetail project={project} preview />
      ) : (
        <form className="editor-form" onSubmit={save}>
          <div className="editor-main">
            <div className="form-grid">
              <Field
                label="Project title"
                required
                maxLength={150}
                value={project.title}
                onChange={(v) => {
                  change('title', v);
                  if (!project.id && !customSlug)
                    change(
                      'slug',
                      v
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, ''),
                    );
                }}
              />
              <Field
                label="Slug"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                value={project.slug}
                onChange={(v) => {
                  setCustomSlug(true);
                  change('slug', v);
                }}
                hint="Lowercase letters, numbers, and hyphens."
              />
            </div>
            <Field
              label="Tagline"
              value={project.tagline}
              onChange={(v) => change('tagline', v)}
              maxLength={300}
            />
            <Field
              label="Atlas connections"
              value={(project.connections || []).join('\n')}
              multiline
              rows={3}
              onChange={(v) => change('connections', v.split('\n'))}
              hint="One connection per line. Reuse a suggestion or type a new label; a new label creates a new path in the Work atlas. If left blank, this project appears under Needs a connection."
            />
            <div className="connection-suggestions" aria-label="Suggested atlas connections">
              <span>ADD A COMMON CONNECTION</span>
              {suggestedConnections.map((label) => (
                <button
                  type="button"
                  key={label}
                  disabled={(project.connections || []).some(
                    (item) => item.trim().toLocaleLowerCase() === label.toLocaleLowerCase(),
                  )}
                  onClick={() => change('connections', [...(project.connections || []), label])}
                >
                  + {label}
                </button>
              ))}
            </div>
            <details className="editor-section-disclosure">
              <summary>Project story and engineering decisions</summary>
              <div className="editor-section-content">
                {[
                  ['overview', 'Overview'],
                  ['problem', 'Problem & purpose'],
                  ['outcomes', 'Results & validation'],
                  ['architecture', 'Architecture & decisions'],
                  ['contribution', 'My individual contribution'],
                  ['challenges', 'Challenges & trade-offs'],
                  ['learnings', 'Learnings'],
                ].map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    value={project[key]}
                    multiline
                    rows={key === 'architecture' ? 6 : 4}
                    onChange={(v) => change(key, v)}
                    hint={
                      key === 'outcomes'
                        ? 'Use only measured results or documented evaluation. Leave unsupported impact blank.'
                        : undefined
                    }
                    maxLength={key === 'architecture' ? 15000 : key === 'outcomes' ? 5000 : 10000}
                  />
                ))}
              </div>
            </details>
            <details className="editor-section-disclosure">
              <summary>Features, technologies, and review notes</summary>
              <div className="editor-section-content">
                {[
                  ['features', 'Key features'],
                  ['technologies', 'Technologies & roles'],
                  ['missingInformation', 'Missing information / private review notes'],
                  ['suggestedSections', 'Suggested sections / private review notes'],
                ].map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    value={project[key].join('\n')}
                    multiline
                    rows={4}
                    onChange={(v) => change(key, v.split('\n'))}
                    hint="One item per line. Empty lines are removed on save."
                  />
                ))}
              </div>
            </details>
          </div>
          <aside className="editor-side">
            <div className="panel">
              <h2>Publication</h2>
              {project.repositoryPrivate && (
                <div className="privacy-notice">
                  <strong>Private repository</strong>
                  <p>
                    Publishing makes these descriptions and images public. The GitHub URL and
                    repository identity stay hidden.
                  </p>
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={project.privatePublicationApproved}
                      onChange={(e) => change('privatePublicationApproved', e.target.checked)}
                    />
                    I approve making this portfolio content public
                  </label>
                </div>
              )}
              <label className="field">
                <span>Status</span>
                <select
                  aria-label="Status"
                  value={project.status}
                  onChange={(e) => change('status', e.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={project.featured}
                  onChange={(e) => change('featured', e.target.checked)}
                />{' '}
                Feature on homepage
              </label>
              <Field
                label="Display order"
                type="number"
                min={0}
                max={10000}
                value={project.position}
                onChange={(v) => change('position', Number(v))}
              />
              <button className="button" disabled={busy}>
                {busy
                  ? 'Working…'
                  : project.status === 'published'
                    ? 'Save & publish'
                    : 'Save draft'}
              </button>
            </div>
            <details className="panel editor-panel-disclosure">
              <summary>Links & images</summary>
              {[
                ['repositoryUrl', 'GitHub repository'],
                ['demoUrl', 'Live demo URL'],
                ['coverImage', 'Cover image URL'],
              ].map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  type="url"
                  value={project[key]}
                  onChange={(v) => change(key, v)}
                />
              ))}
              <Field
                label="Screenshot URLs"
                multiline
                value={project.images.join('\n')}
                onChange={(v) => change('images', v.split('\n'))}
                hint="One HTTPS image URL per line. No file uploads."
              />
            </details>
            <details className="panel editor-panel-disclosure">
              <summary>Repository evidence</summary>
              {project.repositoryPrivate && (
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={allowPrivateSource}
                    onChange={(e) => setAllowPrivateSource(e.target.checked)}
                  />
                  Allow sending selected private source evidence to Gemini
                </label>
              )}
              <p>
                Refresh fetches source evidence without changing your text. Gemini generation opens
                a separate replacement draft.
              </p>
              {project.sourcePaths?.length > 0 && (
                <details className="source-audit">
                  <summary>
                    Analysis sources ({project.sourcePaths.length} files
                    {project.treeTruncated ? ', partial repository tree' : ''})
                  </summary>
                  {project.sourceWarnings?.map((warning) => (
                    <p className="feedback error" key={warning}>
                      {warning}
                    </p>
                  ))}
                  {project.claimEvidence?.length > 0 && (
                    <ul>
                      {project.claimEvidence.map((item, index) => (
                        <li key={`${item.claim}-${index}`}>
                          <strong>{item.claim}</strong>
                          <small>{item.sources.join(' · ')}</small>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="form-note">Inspected files: {project.sourcePaths.join(' · ')}</p>
                </details>
              )}
              {project.id && (
                <button type="button" disabled={busy || !project.repositoryUrl} onClick={refresh}>
                  Refresh evidence
                </button>
              )}
              <button
                type="button"
                disabled={
                  busy ||
                  !project.repositoryUrl ||
                  (project.repositoryPrivate && !allowPrivateSource)
                }
                onClick={regenerate}
              >
                {busy ? 'Working…' : 'Generate / regenerate with Gemini'}
              </button>
            </details>
          </aside>
        </form>
      )}
    </div>
  );
}
