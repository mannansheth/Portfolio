import { Link, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState, useId, useRef } from 'react';
import { ThemeToggle } from './Theme.jsx';
import { Icon } from './Icon.jsx';
import { trackAnalytics } from './analytics.js';
export { Icon } from './Icon.jsx';
export function External({ href, children, ...props }) {
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
      onClick={(event) => {
        const host = (() => {
          try { return new URL(href).hostname; } catch { return ''; }
        })();
        trackAnalytics('outbound_click', { value: host.slice(0, 80) });
        props.onClick?.(event);
      }}
    >
      {children}
    </a>
  ) : null;
}

export function PixelRevealImage({ src, alt, objectPositionY = 0.5, fetchPriority = 'auto', analyticsLabel = 'cover' }) {
  const frameRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const drawRef = useRef(() => {});
  const pointRef = useRef(null);
  const touchActiveRef = useRef(false);
  const trackedRevealRef = useRef(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    const image = imageRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!frame || !image || !canvas || !context) return undefined;

    let animationFrame = 0;
    const draw = () => {
      animationFrame = 0;
      const bounds = frame.getBoundingClientRect();
      if (!image.complete || !image.naturalWidth || !bounds.width || !bounds.height) return;

      const blockSize = 12;
      const pixelWidth = Math.max(1, Math.ceil(bounds.width / blockSize));
      const pixelHeight = Math.max(1, Math.ceil(bounds.height / blockSize));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      context.clearRect(0, 0, pixelWidth, pixelHeight);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';

      // Match object-fit: cover so the pixel layer stays registered with the sharp image.
      const scale = Math.max(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight);
      const sourceWidth = bounds.width / scale;
      const sourceHeight = bounds.height / scale;
      const sourceX = (image.naturalWidth - sourceWidth) / 2;
      const sourceY = (image.naturalHeight - sourceHeight) * objectPositionY;
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        pixelWidth,
        pixelHeight,
      );

      if (pointRef.current) {
        const revealScale = Math.min(pixelWidth / bounds.width, pixelHeight / bounds.height);
        context.globalCompositeOperation = 'destination-out';
        context.beginPath();
        context.arc(
          pointRef.current.x * (pixelWidth / bounds.width),
          pointRef.current.y * (pixelHeight / bounds.height),
          88 * revealScale,
          0,
          Math.PI * 2,
        );
        context.fill();
        context.globalCompositeOperation = 'source-over';
      }
    };

    const scheduleDraw = () => {
      if (!animationFrame) animationFrame = requestAnimationFrame(draw);
    };
    drawRef.current = scheduleDraw;

    const observer = new ResizeObserver(scheduleDraw);
    observer.observe(frame);
    image.addEventListener('load', scheduleDraw);
    scheduleDraw();

    return () => {
      observer.disconnect();
      image.removeEventListener('load', scheduleDraw);
      if (animationFrame) cancelAnimationFrame(animationFrame);
      drawRef.current = () => {};
    };
  }, [objectPositionY, src]);

  const revealAt = (clientX, clientY) => {
    const bounds = frameRef.current?.getBoundingClientRect();
    if (!bounds) return;
    pointRef.current = {
      x: Math.max(0, Math.min(bounds.width, clientX - bounds.left)),
      y: Math.max(0, Math.min(bounds.height, clientY - bounds.top)),
    };
    setActive(true);
    if (!trackedRevealRef.current) {
      trackedRevealRef.current = true;
      trackAnalytics('cover_reveal', { value: analyticsLabel });
    }
    drawRef.current();
  };

  const hideReveal = () => {
    pointRef.current = null;
    setActive(false);
    drawRef.current();
  };

  function moveWithKeyboard(event) {
    const steps = {
      ArrowLeft: [-20, 0],
      ArrowRight: [20, 0],
      ArrowUp: [0, -20],
      ArrowDown: [0, 20],
    };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    const bounds = frameRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const current = pointRef.current || { x: bounds.width / 2, y: bounds.height / 2 };
    pointRef.current = {
      x: Math.max(0, Math.min(bounds.width, current.x + step[0])),
      y: Math.max(0, Math.min(bounds.height, current.y + step[1])),
    };
    setActive(true);
    drawRef.current();
  }

  return (
    <div
      ref={frameRef}
      className={`pixel-reveal-layer${active ? ' is-active' : ''}`}
      role="group"
      tabIndex={0}
      aria-label={`${alt} Move the pointer, drag on a touchscreen, or use the arrow keys to reveal it.`}
      onPointerDown={(event) => {
        if (event.pointerType === 'touch') {
          touchActiveRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        revealAt(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (event.pointerType !== 'touch' || touchActiveRef.current)
          revealAt(event.clientX, event.clientY);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'touch') hideReveal();
      }}
      onPointerUp={(event) => {
        if (event.pointerType === 'touch') {
          touchActiveRef.current = false;
          hideReveal();
        }
      }}
      onPointerCancel={() => {
        touchActiveRef.current = false;
        hideReveal();
      }}
      onFocus={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        revealAt(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
      }}
      onBlur={hideReveal}
      onKeyDown={moveWithKeyboard}
    >
      <img ref={imageRef} src={src} alt={alt} fetchPriority={fetchPriority} draggable="false" />
      <canvas ref={canvasRef} aria-hidden="true" />
      <span className="pixel-reveal-hint" aria-hidden="true">
        HOVER / DRAG TO REVEAL
      </span>
    </div>
  );
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
        <span className="mark"><Icon name="external" /></span>
      </Link>
      <div className="header-controls">
        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? 'Close' : 'Menu'} <Icon name={open ? 'minus' : 'plus'} />
        </button>
      </div>
      <nav id="main-nav" className={open ? 'open' : ''} aria-label="Main navigation">
        <NavLink to="/work">Work</NavLink>
        <NavLink to="/about">About</NavLink>
        <NavLink to="/contact">
          Contact <Icon name="external" />
        </NavLink>
        <div className="header-theme-control">
          <ThemeToggle />
        </div>
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
          <span className="mark"><Icon name="external" /></span>
        </Link>
        <p>Software, systems, and the details in between.</p>
      </div>
      <div className="footer-links">
        {profile.resumeUrl && (
          <a href={profile.resumeUrl} download onClick={() => trackAnalytics('resume_download')}>
            Resume <Icon name="external" />
          </a>
        )}
        <External href={profile.github}>GitHub <Icon name="external" /></External>
        <External href={profile.linkedin}>LinkedIn <Icon name="external" /></External>
        <Link to="/contact">Get in touch <Icon name="external" /></Link>
      </div>
      <div className="footer-note">
        <span>
          © {new Date().getFullYear()} {profile.name}
        </span>
        <span>{profile.location}</span>
      </div>
      <p className="analytics-disclosure">
        First-party analytics stores a random browser ID to group visits, records selected
        interactions, and estimates location from your IP address. The raw IP is not saved in the
        analytics database. Interaction and reading metrics are estimates.
      </p>
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
  'GitHub Actions': 'githubactions/githubactions-original.svg',
  PennyLane: 'local:pennylane.svg',
  'NumPy / SciPy': 'local:numpy-scipy.svg',
  SQL: 'local:sql.svg',
  SVM: 'local:svm.svg',
  XGBoost: 'local:xgboost.svg',
  'AWS EC2': 'local:aws-ec2.svg',
  NLP: 'local:nlp.svg',
};
const publicAsset = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
function technologyIcon(item) {
  if (item === 'SciPy') return 'https://cdn.simpleicons.org/scipy';
  const path = technologyIcons[item];
  if (!path) return publicAsset('images/skills/toolkit.svg');
  if (path.startsWith('local:')) return publicAsset(`images/skills/${path.slice(6)}`);
  return `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${path}`;
}
export function Tags({ items = [], graphic = false }) {
  return (
    <div className={`tags ${graphic ? 'graphic-tags' : ''}`}>
      {items.map((item, i) => {
        const icon = technologyIcon(item);
        return (
          <span className="tech-chip" key={`${item}-${i}`}>
            <img
              src={icon}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              onError={(event) => {
                if (event.currentTarget.dataset.fallback) return;
                event.currentTarget.dataset.fallback = 'true';
                event.currentTarget.src = publicAsset('images/skills/toolkit.svg');
              }}
            />
            <span className="tech-label">{item}</span>
          </span>
        );
      })}
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
    ['Results & validation', 'outcomes', Boolean(project.outcomes)],
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
          <External href={project.repositoryUrl}>View repository <Icon name="external" /></External>
          <External href={project.demoUrl}>Live demo <Icon name="external" /></External>
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
          {project.outcomes && (
            <section id="outcomes">
              <h2>Results &amp; validation</h2>
              <p className="prose">{project.outcomes}</p>
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
          <Icon name="left" /> All work
        </Link>
      )}
    </article>
  );
}
