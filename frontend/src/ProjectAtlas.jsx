import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { External, Tags } from './components.jsx';
import './atlas.css';

const paths = [
  {
    id: 'workflows',
    number: '01',
    title: 'Useful workflows',
    note: 'Products that bring a multi-step task into one place.',
    projects: ['curatus', 'reportr', 'recipeverse'],
  },
  {
    id: 'interaction',
    number: '02',
    title: 'Interaction & feedback',
    note: 'Make changing state visible and easier to understand.',
    projects: ['pathfinder', 'wordle'],
  },
  {
    id: 'experiments',
    number: '03',
    title: 'Learning under constraints',
    note: 'Test an idea against a baseline and a bounded system.',
    projects: ['adaptq', 'recipeverse'],
  },
];

const categories = {
  curatus: 'Wellbeing / web',
  pathfinder: 'Algorithms / interactive',
  adaptq: 'Applied ML / research',
  wordle: 'Play / web',
  reportr: 'Civic tech / mobile',
  recipeverse: 'Food / web',
};

export default function ProjectAtlas({ projects }) {
  const [activePath, setActivePath] = useState('all');
  const [selectedSlug, setSelectedSlug] = useState(projects[0]?.slug || '');
  const bySlug = useMemo(
    () => new Map(projects.map((project) => [project.slug, project])),
    [projects],
  );
  const selected = bySlug.get(selectedSlug) || projects[0];
  const visiblePaths =
    activePath === 'all' ? paths : paths.filter((path) => path.id === activePath);
  const selectedConnections = selected
    ? paths.filter((path) => path.projects.includes(selected.slug))
    : [];

  function choosePath(pathId) {
    setActivePath(pathId);
    if (pathId !== 'all') {
      const firstSlug = paths
        .find((path) => path.id === pathId)
        ?.projects.find((slug) => bySlug.has(slug));
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
            <span>{String(paths.length).padStart(2, '0')} SHARED THREADS</span>
            <span>MUMBAI / INDIA</span>
          </div>
        </div>
        <figure className="atlas-cover">
          <img
            src="/images/work/atlas-cover.jpg"
            alt="Abstract network of illuminated screens, used as a visual cover for the project map."
            fetchPriority="high"
          />
          <figcaption>
            <span>FIELD NOTES / 2026</span>
            <a
              href="https://unsplash.com/photos/abstract-network-of-glowing-screens-in-darkness-f2krpIYBrJc"
              target="_blank"
              rel="noopener noreferrer"
            >
              Image: Johnny Guitar / Unsplash ↗
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
            const linked = path.projects.map((slug) => bySlug.get(slug)).filter(Boolean);
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
                        {categories[project.slug] || 'Software'}
                      </span>
                      <span className="atlas-node-mark" aria-hidden="true">
                        ↗
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
                <span>{categories[selected.slug] || 'SOFTWARE / SYSTEMS'}</span>
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
                Open case file <span aria-hidden="true">↗</span>
              </Link>
              {selected.demoUrl && <External href={selected.demoUrl}>Live demo ↗</External>}
              {selected.repositoryUrl && (
                <External href={selected.repositoryUrl}>Repository ↗</External>
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
          <span>01 — 06 / SELECTED WORK</span>
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
                  {categories[project.slug] || 'Software'}
                </span>
                <span className="atlas-index-summary">{project.tagline}</span>
                <span className="atlas-index-arrow" aria-hidden="true">
                  ↗
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}
