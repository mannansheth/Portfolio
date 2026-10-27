import { Link, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState, useId, useRef } from 'react';
import { ThemeToggle } from './Theme.jsx';
export function External({ href, children, ...props }) {
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ) : null;
}
export function Feedback({ error, message }) {
  return error ? (
    <p className="feedback error" role="alert">
      {error}
    </p>
  ) : message ? (
    <p className="feedback success" role="status">
      {message}
    </p>
  ) : null;
}
export function Header({ profile }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location]);
  return (
    <header className="site-header">
      <Link className="wordmark" to="/" aria-label={`${profile.name}, home`}>
        {profile.name}
        <span className="mark">↗</span>
      </Link>
      <div className="header-controls">
        <ThemeToggle />
        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? 'Close' : 'Menu'} <span aria-hidden="true">{open ? '−' : '+'}</span>
        </button>
      </div>
      <nav id="main-nav" className={open ? 'open' : ''} aria-label="Main navigation">
        <NavLink to="/work">Work</NavLink>
        <NavLink to="/about">About</NavLink>
        <NavLink to="/contact">
          Contact <span aria-hidden="true">↗</span>
        </NavLink>
      </nav>
    </header>
  );
}
export function CustomCursor() {
  const cursor = useRef(null);
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const finePointer = matchMedia('(pointer: fine)').matches;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reducedMotion) return undefined;
    setEnabled(true);
    const move = (event) => {
      document.body.classList.add('has-custom-cursor');
      cursor.current?.style.setProperty('--cursor-x', `${event.clientX}px`);
      cursor.current?.style.setProperty('--cursor-y', `${event.clientY}px`);
    };
    const hover = (event) => {
      if (event.target.closest('a, button, input, textarea, select, [role="button"]'))
        document.body.classList.add('cursor-over-link');
      else document.body.classList.remove('cursor-over-link');
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerover', hover, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerover', hover);
      document.body.classList.remove('has-custom-cursor', 'cursor-over-link');
    };
  }, []);
  return enabled ? (
    <span ref={cursor} className="custom-cursor" aria-hidden="true">
      <span />
    </span>
  ) : null;
}
export function Footer({ profile }) {
  return (
    <footer className="site-footer">
      <div>
        <Link to="/" className="wordmark">
          {profile.name}
          <span className="mark">↗</span>
        </Link>
        <p>Software, systems, and the details in between.</p>
      </div>
      <div className="footer-links">
        <External href={profile.github}>GitHub ↗</External>
        <External href={profile.linkedin}>LinkedIn ↗</External>
        <Link to="/contact">Get in touch ↗</Link>
      </div>
      <div className="footer-note">
        <span>
          © {new Date().getFullYear()} {profile.name}
        </span>
        <span>{profile.location}</span>
      </div>
    </footer>
  );
}
export function Field({ label, value, onChange, multiline = false, hint, ...props }) {
  const generatedId = useId();
  const id = props.id || generatedId;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          id={id}
          aria-describedby={hint ? `${id}-hint` : undefined}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        />
      ) : (
        <input
          id={id}
          aria-describedby={hint ? `${id}-hint` : undefined}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        />
      )}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
const technologyIcons = {
  JavaScript: 'javascript/javascript-original.svg',
  Python: 'python/python-original.svg',
  'C#': 'csharp/csharp-original.svg',
  React: 'react/react-original.svg',
  'Next.js': 'nextjs/nextjs-original.svg',
  'Node.js': 'nodejs/nodejs-original.svg',
  Express: 'express/express-original.svg',
  Flutter: 'flutter/flutter-original.svg',
  'ASP.NET Core': 'dotnetcore/dotnetcore-original.svg',
  MySQL: 'mysql/mysql-original.svg',
  'AWS EC2': 'amazonwebservices/amazonwebservices-original.svg',
  Linux: 'linux/linux-original.svg',
  'HTML Canvas': 'html5/html5-original.svg',
  TensorFlow: 'tensorflow/tensorflow-original.svg',
  NumPy: 'numpy/numpy-original.svg',
  'React Native': 'react/react-original.svg',
  Expo: 'expo/expo-original.svg',
  Cloudinary: 'cloudinary/cloudinary-original.svg',
  Firebase: 'firebase/firebase-plain.svg',
  Flask: 'flask/flask-original.svg',
  Git: 'git/git-original.svg',
  Docker: 'docker/docker-original.svg',
  'Visual Studio Code': 'vscode/vscode-original.svg',
  MongoDB: 'mongodb/mongodb-original.svg',
  Java: 'java/java-original.svg',
  'C++': 'cplusplus/cplusplus-original.svg',
  HTML: 'html5/html5-original.svg',
  CSS: 'css3/css3-original.svg',
};
function technologyIcon(item) {
  if (item === 'SciPy') return 'https://cdn.simpleicons.org/scipy';
  const path = technologyIcons[item];
  return path ? `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${path}` : null;
}
export function Tags({ items = [], graphic = false }) {
  return (
    <div className={`tags ${graphic ? 'graphic-tags' : ''}`}>
      {items.map((item, i) => (
        <span className="tech-chip" key={`${item}-${i}`}>
          {technologyIcon(item) && (
            <img
              src={technologyIcon(item)}
              alt=""
              aria-hidden="true"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          )}
          <span>{item}</span>
        </span>
      ))}
    </div>
  );
}
export function ProjectArt({ project }) {
  const categories = {
    curatus: 'WELLBEING / WEB APP',
    pathfinder: 'ALGORITHMS / INTERACTIVE',
    adaptq: 'MACHINE LEARNING / RESEARCH',
    reportr: 'CIVIC TECH / MOBILE',
    recipeverse: 'FOOD / WEB APP',
    wordle: 'PLAY / WEB APP',
  };
  return (
    <div className={`project-art art-${project.slug}`}>
      <span className="art-caption">{categories[project.slug] || 'SOFTWARE PROJECT'}</span>
      <strong className="art-number">{String((project.position ?? 0) + 1).padStart(2, '0')}</strong>
      <span className="art-title">{project.title}</span>
    </div>
  );
}
export function ProjectDetail({ project, preview = false }) {
  const sections = [
    ['Overview', 'overview', Boolean(project.overview)],
    ['The problem', 'problem', Boolean(project.problem)],
    ['What it does', 'features', project.features.length > 0],
    ['Interface', 'interface', project.images.length > 0],
    ['Architecture', 'architecture', Boolean(project.architecture)],
    ['My contribution', 'contribution', Boolean(project.contribution)],
    ['Challenges & trade-offs', 'challenges', Boolean(project.challenges)],
    ['What I learned', 'learnings', Boolean(project.learnings)],
  ].filter(([, , visible]) => visible);
  const imageDescriptions = {
    pathfinder:
      'Pathfinder showing a five-node weighted graph, with N0 selected as the source and N4 as the destination.',
    wordle:
      'Wordle Clone after the guess CRANE, with letter feedback on the board and the on-screen keyboard below.',
  };
  const imageCaptions = {
    pathfinder: 'A weighted graph ready for a shortest-path walkthrough.',
    wordle: 'A submitted guess updates the board and the on-screen keyboard.',
  };
  return (
    <article className="project-detail">
      {preview && <p className="preview-banner">Unpublished preview · only visible to you</p>}
      <div className="detail-heading">
        <p className="eyebrow">
          CASE FILE / {String((project.position ?? 0) + 1).padStart(2, '0')}
        </p>
        <h1>{project.title}</h1>
        <p className="lead">{project.tagline}</p>
        <Tags items={project.technologies} />
        <div className="inline-links">
          <External href={project.repositoryUrl}>View repository ↗</External>
          <External href={project.demoUrl}>Live demo ↗</External>
        </div>
      </div>
      <ProjectArt project={project} />
      <div className="essay-layout">
        <aside>
          <p className="eyebrow">IN THIS PROJECT</p>
          {sections.map(([label, id]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </aside>
        <div className="essay">
          {project.overview && (
            <section id="overview">
              <h2>Overview</h2>
              <p className="prose">{project.overview}</p>
            </section>
          )}
          {project.problem && (
            <section id="problem">
              <h2>The problem</h2>
              <p className="prose">{project.problem}</p>
            </section>
          )}
          {project.features.length > 0 && (
            <section id="features">
              <h2>What it does</h2>
              <ul>
                {project.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </section>
          )}
          {project.images.length > 0 && (
            <section id="interface" className="project-interface">
              <h2>In the interface</h2>
              {project.images.map((url, i) => (
                <figure key={url}>
                  <img
                    src={url}
                    alt={
                      imageDescriptions[project.slug] || `${project.title} interface view ${i + 1}.`
                    }
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption>
                    {imageCaptions[project.slug] || `${project.title} interface view ${i + 1}.`}
                  </figcaption>
                </figure>
              ))}
            </section>
          )}
          {[
            ['Architecture', project.architecture],
            ['My contribution', project.contribution],
            ['Challenges & trade-offs', project.challenges],
            ['What I learned', project.learnings],
          ].map(([name, text]) => {
            const id = {
              Architecture: 'architecture',
              'My contribution': 'contribution',
              'Challenges & trade-offs': 'challenges',
              'What I learned': 'learnings',
            }[name];
            return text ? (
              <section id={id} key={id}>
                <h2>{name}</h2>
                <p className="prose">{text}</p>
              </section>
            ) : null;
          })}
        </div>
      </div>
      {!preview && (
        <Link to="/work" className="text-link">
          ← All work
        </Link>
      )}
    </article>
  );
}
