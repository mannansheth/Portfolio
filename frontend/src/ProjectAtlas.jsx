import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { External, Tags, PixelRevealImage, Icon } from './components.jsx';
import './atlas.css';

const unassignedLabel = 'Needs a connection';
const connectionNotes = {
  'useful workflows': 'Products that bring a multi-step task into one place.',
  'interaction & feedback': 'Make changing state visible and easier to understand.',
  'learning under constraints': 'Test an idea against a baseline and a bounded system.',
  'developer tools': 'Tools that help engineers inspect and reason about software.',
  'applied ai': 'AI and machine learning applied to domain-specific tasks.',
  'civic technology': 'Software that helps residents and public services coordinate local issues.',
  'community systems': 'Shared contributions and evidence shape the outcome.',
  'food & cooking': 'Tools for discovering recipes and making better cooking decisions.',
  'digital wellbeing': 'Digital support for mental wellness and care workflows.',
  'clinical optimization': 'Research on adapting treatment plans as conditions change.',
  'interactive learning': 'Learn through responsive controls and immediate visual feedback.',
  'algorithm visualization': 'Visualize how algorithms explore and compare possible paths.',
};

function connectionLabels(project) {
  return [...new Set((project.connections || []).map((label) => label.trim()).filter(Boolean))];
}

function connectionId(label) {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'connection'
  );
}

export default function ProjectAtlas({ projects }) {
  const [activePath, setActivePath] = useState('all');
  const [selectedSlug, setSelectedSlug] = useState(projects[0]?.slug || '');
  const paths = useMemo(() => {
    const canonicalLabels = new Map();
    projects.forEach((project) => {
      const labels = connectionLabels(project);
      (labels.length ? labels : [unassignedLabel]).forEach((label) => {
        const key = label.toLocaleLowerCase();
        if (!canonicalLabels.has(key)) canonicalLabels.set(key, label);
      });
    });
    return [...canonicalLabels].map(([key, title], index) => ({
      id: `${connectionId(title)}-${index + 1}`,
      number: String(index + 1).padStart(2, '0'),
      title,
      note: connectionNotes[key] || 'Projects connected through this shared theme.',
      projects: projects.filter((project) => {
        const labels = connectionLabels(project);
        return labels.length
          ? labels.some((label) => label.toLocaleLowerCase() === key)
          : key === unassignedLabel.toLocaleLowerCase();
      }),
    }));
  }, [projects]);
  const bySlug = useMemo(
    () => new Map(projects.map((project) => [project.slug, project])),
    [projects],
  );
  const selected = bySlug.get(selectedSlug) || projects[0];
  const visiblePaths =
    activePath === 'all' ? paths : paths.filter((path) => path.id === activePath);
  const selectedConnections = selected
    ? paths.filter((path) => path.projects.some((project) => project.slug === selected.slug))
    : [];

  function choosePath(pathId) {
    setActivePath(pathId);
    if (pathId !== 'all') {
      const firstSlug = paths
        .find((path) => path.id === pathId)
        ?.projects.find((project) => bySlug.has(project.slug))?.slug;
      if (firstSlug) setSelectedSlug(firstSlug);
    }
  }

  return (
    <section className="page atlas-page" aria-labelledby="atlas-title">
      <header className="atlas-heading">
        <div className="atlas-intro">
          <p className="eyebrow">PORTFOLIO / COMPUTER ENGINEERING</p>
          <h1 id="atlas-title">A map of the work.</h1>
          <p className="atlas-lead">
            {projects.length} projects, connected by the problems they explore. Follow a path,
            select a project, and open its case file.
          </p>
          <div className="atlas-meta">
            <span>{String(projects.length).padStart(2, '0')} PROJECTS</span>
            <span>{String(paths.length).padStart(2, '0')} THEMES</span>
            <span>MUMBAI / INDIA</span>
          </div>
        </div>
        <figure className="atlas-cover">
          <PixelRevealImage
            src={`${import.meta.env.BASE_URL}images/work/atlas-cover.jpg`}
            alt="Abstract network of illuminated screens, used as a visual cover for the project map."
            fetchPriority="high"
            objectPositionY={0.58}
          />
          <figcaption>
            <span>FIELD NOTES / 2026</span>
            <a
              href="https://unsplash.com/photos/abstract-network-of-glowing-screens-in-darkness-f2krpIYBrJc"
              target="_blank"
              rel="noopener noreferrer"
            >
              Image: Johnny Guitar / Unsplash <Icon name="external" />
            </a>
          </figcaption>
        </figure>
      </header>

      <div className="atlas-toolbar">
        <div>
          <p className="eyebrow">EXPLORE BY CONNECTION</p>
          <p>Choose a thread to focus the map.</p>
        </div>
        <div className="atlas-filters" role="group" aria-label="Filter project connections">
          <button
            type="button"
            aria-pressed={activePath === 'all'}
            onClick={() => choosePath('all')}
          >
            All threads
          </button>
          {paths.map((path) => (
            <button
              type="button"
              key={path.id}
              aria-pressed={activePath === path.id}
              onClick={() => choosePath(path.id)}
            >
              {path.title}
            </button>
          ))}
        </div>
      </div>

      <div className="atlas-layout">
        <nav className="atlas-map" aria-label="Projects grouped by shared themes">
          {visiblePaths.map((path) => {
            const linked = path.projects;
            if (!linked.length) return null;
            return (
              <section
                className={`atlas-thread ${activePath === path.id ? 'is-focused' : ''} ${activePath !== 'all' && activePath !== path.id ? 'is-muted' : ''}`}
                key={path.id}
                aria-labelledby={`atlas-thread-${path.id}`}
              >
                <div className="atlas-thread-heading">
                  <span className="atlas-thread-number">{path.number}</span>
                  <div>
                    <h2 id={`atlas-thread-${path.id}`}>{path.title}</h2>
                    <p>{path.note}</p>
                  </div>
                </div>
                <div className="atlas-nodes">
                  {linked.map((project) => (
                    <button
                      className={`atlas-node ${selected?.slug === project.slug ? 'is-selected' : ''}`}
                      type="button"
                      key={project.slug}
                      aria-pressed={selected?.slug === project.slug}
                      onClick={() => setSelectedSlug(project.slug)}
                    >
                      <span className="atlas-node-number">
                        {String((project.position ?? 0) + 1).padStart(2, '0')}
                      </span>
                      <span className="atlas-node-name">{project.title}</span>
                      <span className="atlas-node-category">
                        {connectionLabels(project)[0] || unassignedLabel}
                      </span>
                      <span className="atlas-node-mark" aria-hidden="true">
                        <Icon name="external" />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </nav>

        {selected && (
          <aside className="atlas-detail" aria-live="polite" aria-labelledby="atlas-selected-title">
            <p className="eyebrow">
              SELECTED CASE FILE / {String((selected.position ?? 0) + 1).padStart(2, '0')}
            </p>
            {selected.images?.[0] ? (
              <div className="atlas-project-visual has-project-image">
                <img
                  src={selected.images[0]}
                  alt={`${selected.title} interface preview`}
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="atlas-project-visual" aria-hidden="true">
                <span>{connectionLabels(selected)[0] || unassignedLabel}</span>
                <strong>{selected.title}</strong>
                <i />
              </div>
            )}
            <h2 id="atlas-selected-title">{selected.title}</h2>
            <p className="atlas-selected-tagline">{selected.tagline}</p>
            <p className="atlas-selected-overview">{selected.overview}</p>
            <div className="atlas-connections">
              <span className="eyebrow">CONNECTED THROUGH</span>
              <div>
                {selectedConnections.map((path) => (
                  <span key={path.id}>{path.title}</span>
                ))}
              </div>
            </div>
            <div className="atlas-tech">
              <span className="eyebrow">BUILT WITH</span>
              <Tags items={selected.technologies} />
            </div>
            <div className="atlas-actions">
              <Link className="atlas-case-link" to={`/work/${selected.slug}`}>
                Open case file <Icon name="external" />
              </Link>
              {selected.demoUrl && <External href={selected.demoUrl}>Live demo <Icon name="external" /></External>}
              {selected.repositoryUrl && (
                <External href={selected.repositoryUrl}>Repository <Icon name="external" /></External>
              )}
            </div>
          </aside>
        )}
      </div>

      <section className="atlas-index" aria-labelledby="atlas-index-title">
        <div className="atlas-index-heading">
          <div>
            <p className="eyebrow">THE COMPLETE INDEX</p>
            <h2 id="atlas-index-title">Every case file.</h2>
          </div>
          <span>01 — {String(projects.length).padStart(2, '0')} / SELECTED WORK</span>
        </div>
        <ol>
          {projects.map((project) => (
            <li key={project.slug}>
              <Link to={`/work/${project.slug}`}>
                <span className="atlas-index-number">
                  {String((project.position ?? 0) + 1).padStart(2, '0')}
                </span>
                <span className="atlas-index-name">{project.title}</span>
                <span className="atlas-index-category">
                  {connectionLabels(project)[0] || unassignedLabel}
                </span>
                <span className="atlas-index-summary">{project.tagline}</span>
                <span className="atlas-index-arrow" aria-hidden="true">
                  <Icon name="external" />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}
