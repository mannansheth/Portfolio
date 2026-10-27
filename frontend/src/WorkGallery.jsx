import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { External, Tags, Icon } from './components.jsx';

const identities = {
  curatus: { category: 'Wellbeing / web application' },
  pathfinder: {
    category: 'Algorithms / interactive',
    image: '/images/work/pathfinder.png',
  },
  adaptq: { category: 'Machine learning / research' },
  wordle: { category: 'Play / web application', image: '/images/work/wordle.png' },
  reportr: { category: 'Civic tech / mobile' },
  recipeverse: { category: 'Food / web application' },
};

function ProjectCover({ project, identity }) {
  const source = project.coverImage || project.images?.find(Boolean) || identity.image;
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [source]);
  return (
    <Link
      className={`folio-cover ${source && !failed ? 'has-image' : 'is-poster'}`}
      to={`/work/${project.slug}`}
      aria-label={`View ${project.title} project notes`}
    >
      {source && !failed ? (
        <img
          src={source}
          alt={`${project.title} application interface`}
          loading="lazy"
          decoding="async"
          width="800"
          height="500"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="folio-poster" aria-hidden="true">
          <span className="folio-poster-label">{identity.category.split(' / ')[0]}</span>
          <span className="folio-poster-title">{project.title}</span>
          <span className="folio-poster-stack">{project.technologies.slice(0, 3).join(' / ')}</span>
        </div>
      )}
      <span className="folio-preview" aria-hidden="true">
        Open project notes <Icon name="external" />
      </span>
    </Link>
  );
}

export default function WorkGallery({ projects, featured = false }) {
  const shown = featured ? projects.filter((project) => project.featured) : projects;
  const gallery = useRef(null);
  const projectKey = shown.map((project) => project.id).join(',');

  useEffect(() => {
    const root = gallery.current;
    if (!root) return undefined;
    const slots = [...root.querySelectorAll('.folio-slot')];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const animations = new Set();
    let frame = 0;
    let lightFrame = 0;
    let litSurface = null;
    const update = () => {
      frame = 0;
      const header = document.querySelector('.site-header');
      const headerBottom = header ? header.getBoundingClientRect().bottom : 72;
      const heights = slots.map((slot) => slot.offsetHeight);
      const depthBudget = Math.min(slots.length - 1, 5) * 9;
      const basePin = Math.min(
        Math.max(84, headerBottom + 18),
        window.innerHeight - Math.max(0, ...heights) - depthBudget - 20,
      );
      slots.forEach((slot, index) => {
        // Tall cards pin only once their footer can be reached, even on short screens.
        const pin = basePin + Math.min(index, 5) * 9;
        slot.style.setProperty('--pin', `${pin}px`);
      });
      const bounds = slots.map((slot) => slot.getBoundingClientRect());
      slots.forEach((slot, index) => {
        let progress = 0;
        if (!reduced.matches && bounds[index + 1]) {
          const pin = parseFloat(slot.style.getPropertyValue('--pin'));
          const nextPin = parseFloat(slots[index + 1].style.getPropertyValue('--pin'));
          progress = Math.max(
            0,
            Math.min(
              1,
              (pin + heights[index] - bounds[index + 1].top) /
                Math.max(1, heights[index] - nextPin + pin),
            ),
          );
        }
        slot.style.setProperty('--stack-scale', String(1 - progress * 0.045));
        slot.style.setProperty('--stack-shift', `${progress * -3}px`);
        slot.style.setProperty('--shadow-alpha', String(0.52 - progress * 0.22));
        slot.style.setProperty('--edge-alpha', String(0.12 - progress * 0.06));
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const clearLight = () => {
      cancelAnimationFrame(lightFrame);
      lightFrame = 0;
      if (litSurface) delete litSurface.dataset.lit;
      litSurface = null;
    };
    const pointerMove = (event) => {
      if (event.pointerType !== 'mouse' || !finePointer.matches || reduced.matches) return;
      const surface = event.target.closest('.folio-surface');
      if (!surface) {
        clearLight();
        return;
      }
      const { clientX, clientY } = event;
      cancelAnimationFrame(lightFrame);
      lightFrame = requestAnimationFrame(() => {
        if (litSurface && litSurface !== surface) delete litSurface.dataset.lit;
        litSurface = surface;
        const bounds = surface.getBoundingClientRect();
        surface.style.setProperty(
          '--light-x',
          `${((clientX - bounds.left) / bounds.width) * 100}%`,
        );
        surface.style.setProperty(
          '--light-y',
          `${((clientY - bounds.top) / bounds.height) * 100}%`,
        );
        surface.dataset.lit = 'true';
      });
    };
    root.addEventListener('pointermove', pointerMove, { passive: true });
    root.addEventListener('pointerleave', clearLight);
    const preferenceChanged = () => {
      clearLight();
      if (reduced.matches) animations.forEach((animation) => animation.cancel());
      schedule();
    };
    const observer =
      'IntersectionObserver' in window
        ? new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                observer.unobserve(entry.target);
                const index = slots.indexOf(entry.target);
                const entrance = entry.target.querySelector('.folio-entrance');
                if (reduced.matches || !entrance.animate) return;
                const animation = entrance.animate(
                  [
                    { transform: `translate(${index % 2 ? 14 : -14}px, 16px)` },
                    { transform: 'translate(0, 0)' },
                  ],
                  { duration: 520, delay: (index % 3) * 45, easing: 'cubic-bezier(.2,.7,.2,1)' },
                );
                animations.add(animation);
                animation.onfinish = () => animations.delete(animation);
              });
            },
            { threshold: 0.08 },
          )
        : null;
    slots.forEach((slot) => observer?.observe(slot));
    const resize = new ResizeObserver(schedule);
    resize.observe(root);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    reduced.addEventListener('change', preferenceChanged);
    finePointer.addEventListener('change', preferenceChanged);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      resize.disconnect();
      animations.forEach((animation) => animation.cancel());
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      reduced.removeEventListener('change', preferenceChanged);
      finePointer.removeEventListener('change', preferenceChanged);
      root.removeEventListener('pointermove', pointerMove);
      root.removeEventListener('pointerleave', clearLight);
      clearLight();
    };
  }, [projectKey]);

  return (
    <div className="folio-gallery" ref={gallery}>
      <div className="folio-margin-note" aria-hidden="true">
        SOFTWARE / SELECTED STUDIES
      </div>
      {shown.map((project, index) => {
        const identity = identities[project.slug] || {
          category: 'Software / project',
        };
        return (
          <article
            key={project.id}
            className="folio-slot"
            style={{ '--order': index }}
            aria-labelledby={`folio-title-${project.id}`}
          >
            <div className="folio-entrance">
              <div className="folio-surface" data-project={project.slug}>
                <div className="folio-card-top">
                  <span className="folio-number" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="folio-category">{identity.category}</span>
                  <span className="folio-edition" aria-hidden="true">
                    MS / {String(shown.length).padStart(2, '0')}
                  </span>
                </div>
                <ProjectCover project={project} identity={identity} />
                <div className="folio-copy">
                  <h3 id={`folio-title-${project.id}`}>{project.title}</h3>
                  <p>{project.tagline}</p>
                  <div className="folio-tech">
                    <span className="folio-tech-label">Built with</span>
                    <Tags items={project.technologies} graphic />
                  </div>
                  <nav className="folio-actions" aria-label={`${project.title} links`}>
                    <Link className="folio-primary" to={`/work/${project.slug}`}>
                      Project notes <Icon name="external" />
                    </Link>
                    {project.demoUrl && (
                      <External href={project.demoUrl}>
                        Live demo <Icon name="external" />
                      </External>
                    )}
                    {project.repositoryUrl && (
                      <External href={project.repositoryUrl}>
                        GitHub <Icon name="external" />
                      </External>
                    )}
                  </nav>
                </div>
              </div>
            </div>
          </article>
        );
      })}
      {!shown.length && (
        <p className="empty">
          Project notes are being prepared. Explore the public repositories on GitHub in the
          meantime.
        </p>
      )}
    </div>
  );
}
