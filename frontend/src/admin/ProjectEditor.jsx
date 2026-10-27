import { useState } from 'react';
import { api } from '../api.js';
import { Field, Feedback, ProjectDetail } from '../components.jsx';
export const emptyProject = {
  title: '',
  slug: '',
  tagline: '',
  overview: '',
  problem: '',
  architecture: '',
  contribution: '',
  challenges: '',
  learnings: '',
  features: [],
  technologies: [],
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
                }));
                setCandidate(null);
                setMessage('Generated text applied to the editor. Review and save when ready.');
              }}
            >
              Replace descriptive fields
            </button>
            <button onClick={() => setCandidate(null)}>Keep my text</button>
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
            {[
              ['overview', 'Overview'],
              ['problem', 'Problem & purpose'],
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
                maxLength={key === 'architecture' ? 15000 : 10000}
              />
            ))}
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
            <div className="panel">
              <h2>Links & images</h2>
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
            </div>
            <div className="panel">
              <h2>Repository evidence</h2>
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
            </div>
          </aside>
        </form>
      )}
    </div>
  );
}
