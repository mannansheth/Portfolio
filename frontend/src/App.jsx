import { useEffect, useState } from 'react';
import { Routes, Route, Link, useParams, useLocation } from 'react-router-dom';
import { api } from './api.js';
import {
  Header,
  Footer,
  External,
  Tags,
  ProjectDetail,
  Field,
  Feedback,
  CustomCursor,
  PixelRevealImage,
  Icon,
} from './components.jsx';
import Admin from './admin/Admin.jsx';
import AnalyticsTracker from './AnalyticsTracker.jsx';
import ProjectAtlas from './ProjectAtlas.jsx';
import { trackAnalytics } from './analytics.js';

function setPageMetadata(title, description) {
  document.title = title;
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'description';
    document.head.append(meta);
  }
  meta.content = description.slice(0, 160);
}

function ContributionBoard({ profile }) {
  const [calendar, setCalendar] = useState(null);
  const [error, setError] = useState('');
  const login = (() => {
    try {
      return new URL(profile.github).pathname.split('/').filter(Boolean)[0] || 'mannansheth';
    } catch {
      return 'mannansheth';
    }
  })();
  useEffect(() => {
    let active = true;
    api(`/github/contributions?username=${encodeURIComponent(login)}`)
      .then((data) => active && setCalendar(data))
      .catch((reason) => active && setError(reason.message));
    return () => {
      active = false;
    };
  }, [login]);
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return (
    <section className="contribution-section">
      <div className="contribution-heading">
        <div>
          <p className="eyebrow">OPEN SOURCE / GITHUB</p>
          <h2>Little squares, lots of code.</h2>
        </div>
        <External href={profile.github}>View GitHub profile</External>
      </div>
      {calendar ? (
        <div className="contribution-panel">
          <p className="contribution-total">
            <strong>{calendar.totalContributions.toLocaleString()}</strong> contributions in the
            last year
          </p>
          <div className="contribution-scroll">
            <div
              className="contribution-months"
              style={{ '--week-count': calendar.weeks.length }}
              aria-hidden="true"
            >
              {calendar.weeks.map((week, index) => {
                const date = week.contributionDays[0]?.date;
                if (!date || new Date(`${date}T00:00:00Z`).getUTCDate() > 7) return null;
                return (
                  <span key={`${date}-${index}`} style={{ gridColumn: index + 2 }}>
                    {monthNames[new Date(`${date}T00:00:00Z`).getUTCMonth()]}
                  </span>
                );
              })}
            </div>
            <div
              className="contribution-grid"
              role="img"
              aria-label={`${calendar.totalContributions} GitHub contributions in the last year`}
            >
              <div className="weekday-labels" aria-hidden="true">
                <span />
                <span>Mon</span>
                <span />
                <span>Wed</span>
                <span />
                <span>Fri</span>
                <span />
              </div>
              {calendar.weeks.map((week, index) => (
                <div className="contribution-week" key={week.firstDay || index}>
                  {week.contributionDays.map((day) => (
                    <span
                      key={day.date}
                      className="contribution-day"
                      data-level={day.contributionLevel}
                      title={`${day.date}: ${day.contributionCount} contributions`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="contribution-legend">
            <span>Less</span>
            <i data-level="NONE" />
            <i data-level="FIRST_QUARTILE" />
            <i data-level="SECOND_QUARTILE" />
            <i data-level="THIRD_QUARTILE" />
            <i data-level="FOURTH_QUARTILE" />
            <span>More</span>
          </div>
        </div>
      ) : error ? (
        <p className="contribution-note" role="status">
          {error.includes('GITHUB_TOKEN')
            ? 'Add a read-only GITHUB_TOKEN to backend/.env to show the live contribution board.'
            : 'GitHub activity is temporarily unavailable.'}
        </p>
      ) : (
        <p className="contribution-note" role="status">
          Loading GitHub activity...
        </p>
      )}
    </section>
  );
}

function HomeProjectCard({ project }) {
  const connections = project.connections?.length ? project.connections : ['Needs a connection'];
  const href = `/work/${project.slug}`;
  return (
    <article className="home-project-card">
      <div className="home-project-topline">
        <span>{String((project.position ?? 0) + 1).padStart(2, '0')} / SELECTED</span>
        <span>{connections[0]}</span>
      </div>
      <Link
        className="home-project-visual"
        to={href}
        aria-label={`Open ${project.title} case file`}
        data-analytics-project={project.slug}
        onClick={() => trackAnalytics('project_open', { projectSlug: project.slug })}
      >
        {project.images?.[0] ? (
          <img src={project.images[0]} alt={`${project.title} interface preview`} loading="lazy" />
        ) : (
          <div className="home-project-art" aria-hidden="true">
            <span>{connections[0]}</span>
            <strong>{project.title}</strong>
            <i />
          </div>
        )}
        <span className="home-project-open">OPEN CASE FILE <Icon name="external" /></span>
      </Link>
      <div className="home-project-copy">
        <h3>
          <Link to={href} onClick={() => trackAnalytics('project_open', { projectSlug: project.slug })}>{project.title}</Link>
        </h3>
        <p>{project.tagline}</p>
        <div className="home-project-connections" aria-label="Project connections">
          {connections.map((connection) => (
            <span key={connection}>{connection}</span>
          ))}
        </div>
        <div className="home-project-bottom">
          <span>{project.technologies.slice(0, 3).join(' / ')}</span>
          <Link to={href} onClick={() => trackAnalytics('project_open', { projectSlug: project.slug })}>Case file <Icon name="external" /></Link>
        </div>
      </div>
    </article>
  );
}

function Home({ profile, projects }) {
  const featured = projects.filter((project) => project.featured).slice(0, 3);
  return (
    <>
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow">COMPUTER ENGINEERING / CLASS OF {profile.graduationYear}</p>
          <h1>{profile.introduction}</h1>
          <p className="home-hero-summary">{profile.interests}</p>
          <p className="home-hero-bio">{profile.biography.split('\n\n')[0]}</p>
          <div className="home-hero-actions">
            <Link className="home-primary-action" to="/work">
              Explore the project map <Icon name="external" />
            </Link>
          </div>
          <div className="home-hero-meta">
            <span>{profile.location}</span>
            <span>{String(projects.length).padStart(2, '0')} PROJECTS</span>
            <span>WEB / SYSTEMS / APPLIED ML</span>
          </div>
        </div>
        <figure className="home-hero-cover">
          <PixelRevealImage
            src={`${import.meta.env.BASE_URL}images/work/atlas-cover.jpg`}
            alt="Abstract illuminated screens and connections, used as portfolio cover artwork."
            fetchPriority="high"
            objectPositionY={0.56}
            analyticsLabel="home-cover"
          />
          <figcaption>
            <span>FIELD NOTES / MANNAN SHETH</span>
            <a
              href="https://unsplash.com/photos/abstract-network-of-glowing-screens-in-darkness-f2krpIYBrJc"
              target="_blank"
              rel="noopener noreferrer"
            >
              Johnny Guitar / Unsplash <Icon name="external" />
            </a>
          </figcaption>
        </figure>
      </section>
      <section className="home-work" aria-labelledby="home-work-title">
        <div className="home-section-heading">
          <div>
            <p className="eyebrow">01 / SELECTED PROJECTS</p>
            <h2 id="home-work-title">A few things I’ve built.</h2>
          </div>
          <p>Browse by project, or follow the connections between them.</p>
        </div>
        <div className="home-project-grid">
          {featured.map((project) => (
            <HomeProjectCard project={project} key={project.slug} />
          ))}
        </div>
        <Link to="/work" className="home-atlas-link">
          Explore all {projects.length} projects in the atlas <Icon name="external" />
        </Link>
      </section>
      <section className="home-about">
        <p className="eyebrow">02 / ABOUT</p>
        <div>
          <h2>How I like to work.</h2>
          <p>{profile.biography.split('\n\n')[1] || profile.biography}</p>
          <Link to="/about">More about me <Icon name="external" /></Link>
        </div>
      </section>
      {profile.experience && (
        <section className="home-experience">
          <div>
            <p className="eyebrow">03 / RECENT INDUSTRY WORK</p>
            <h2>Finance workflows, in one place.</h2>
            <p>{profile.experience}</p>
          </div>
          <Link to="/about">Experience & education <Icon name="external" /></Link>
        </section>
      )}
      <section className="home-skills" aria-labelledby="home-skills-title">
        <div>
          <p className="eyebrow">04 / TOOLKIT</p>
          <h2 id="home-skills-title">Tools I work with.</h2>
        </div>
        <Tags items={profile.skills} />
      </section>
      <ContributionBoard profile={profile} />
      <section className="contact-band">
        <p className="eyebrow">05 / NEXT CONVERSATION</p>
        <h2>
          Something worth
          <br />
          building together?
        </h2>
        <Link to="/contact">
          Let’s talk <Icon name="external" />
        </Link>
      </section>
    </>
  );
}
function Work({ projects }) {
  return <ProjectAtlas projects={projects} />;
}
function About({ profile }) {
  return (
    <section className="page">
      <p className="eyebrow">A LITTLE CONTEXT</p>
      <h1>Behind the work.</h1>
      <div className="about-layout">
        <div className="about-monogram" aria-hidden="true">
          MS<span>MUMBAI / {profile.graduationYear}</span>
        </div>
        <div className="essay">
          <section>
            <h2>{profile.name}</h2>
            <p className="prose">{profile.biography}</p>
          </section>
          <section>
            <h2>Education</h2>
            <p className="prose">{profile.education}</p>
          </section>
          {profile.experience && (
            <section>
              <h2>Experience</h2>
              <p className="prose">{profile.experience}</p>
            </section>
          )}
          <section>
            <h2>What I’m thinking about</h2>
            <p>{profile.interests}</p>
          </section>
          <section>
            <h2>Technical skills</h2>
            <Tags items={profile.skills} graphic />
          </section>
          <div className="inline-links">
            <External href={profile.github}>GitHub <Icon name="external" /></External>
            <External href={profile.linkedin}>LinkedIn <Icon name="external" /></External>
          </div>
        </div>
      </div>
    </section>
  );
}
function Contact({ profile }) {
  const [form, setForm] = useState({
      name: '',
      email: '',
      message: '',
      website: '',
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await api('/contact', { method: 'POST', body: form });
      trackAnalytics('contact_submit');
      setMessage(result.message);
      setForm({ name: '', email: '', message: '', website: '' });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="page contact-page">
      <p className="eyebrow">THE NEXT CONVERSATION</p>
      <h1>Let’s talk.</h1>
      <div className="contact-layout">
        <div>
          <p className="lead">
            A project, a question,
            <br />
            or an interesting problem.
          </p>
          <p>You can reach me through the form or find my work on GitHub.</p>
          <div className="contact-links">
            {profile.email && <a href={`mailto:${profile.email}`} onClick={() => trackAnalytics('outbound_click', { target: 'email' })}>{profile.email} <Icon name="external" /></a>}
            <External href={profile.linkedin}>LinkedIn <Icon name="external" /></External>
            <External href={profile.github}>GitHub <Icon name="external" /></External>
          </div>
          <p className="eyebrow">{profile.location}</p>
        </div>
        <form onSubmit={submit}>
          <Field
            label="Your name"
            value={form.name}
            onChange={(name) => setForm({ ...form, name })}
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
          />
          <Field
            label="Email address"
            value={form.email}
            onChange={(email) => setForm({ ...form, email })}
            type="email"
            required
            maxLength={254}
            autoComplete="email"
          />
          <Field
            label="What’s on your mind?"
            value={form.message}
            onChange={(message) => setForm({ ...form, message })}
            multiline
            required
            minLength={10}
            maxLength={5000}
            rows={6}
          />
          <label className="honeypot" aria-hidden="true">
            Website
            <input
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              tabIndex={-1}
              autoComplete="off"
            />
          </label>
          <button className="button" disabled={busy}>
            {busy ? 'Sending…' : <>Send message <Icon name="external" /></>}
          </button>
          <Feedback error={error} message={message} />
          <p className="form-note">Your details are used only to respond to your message.</p>
        </form>
      </div>
    </section>
  );
}
function Project() {
  const { slug } = useParams(),
    [project, setProject] = useState(null),
    [error, setError] = useState('');
  useEffect(() => {
    setProject(null);
    setError('');
    let active = true;
    api(`/projects/${encodeURIComponent(slug)}`)
      .then((p) => active && setProject(p))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [slug]);
  return error ? (
    <section className="page">
      <h1>Project unavailable.</h1>
      <Feedback error={error} />
      <Link to="/work">Back to work</Link>
    </section>
  ) : project ? (
    <ProjectDetail project={project} />
  ) : (
    <p className="loading" role="status">
      Opening project notes…
    </p>
  );
}
export default function App() {
  const [profile, setProfile] = useState(null),
    [projects, setProjects] = useState([]),
    [error, setError] = useState('');
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    if (isAdmin) return;
    setError('');
    Promise.all([api('/profile'), api('/projects')])
      .then(([p, items]) => {
        setProfile(p);
        setProjects(items);
      })
      .catch((e) => setError(e.message));
  }, [isAdmin]);
  useEffect(() => {
    if (isAdmin || !profile) return;
    const path = location.pathname;
    if (path === '/') {
      setPageMetadata(
        `${profile.name} — Software engineering & selected work`,
        `${profile.introduction} ${profile.interests}`,
      );
    } else if (path === '/work') {
      setPageMetadata(
        `Selected work — ${profile.name}`,
        `Explore ${projects.length} software projects across web applications, interactive tools, and machine-learning research.`,
      );
    } else if (path === '/about') {
      setPageMetadata(`About ${profile.name}`, profile.biography);
    } else if (path === '/contact') {
      setPageMetadata(
        `Contact ${profile.name}`,
        'Get in touch about a project, a question, or an interesting problem.',
      );
    } else if (path.startsWith('/work/')) {
      const slug = path.split('/').filter(Boolean).at(-1);
      const project = projects.find((item) => item.slug === slug);
      setPageMetadata(
        project ? `${project.title} — ${profile.name}` : `Project notes — ${profile.name}`,
        project?.tagline ||
          'Project case studies, implementation details, and engineering decisions.',
      );
    } else {
      setPageMetadata(`Page not found — ${profile.name}`, 'The requested page could not be found.');
    }
  }, [isAdmin, location.pathname, profile, projects]);
  if (isAdmin) return <Admin onProfileChange={setProfile} />;
  if (error)
    return (
      <main className="page">
        <p className="eyebrow">MANNAN SHETH / PORTFOLIO</p>
        <h1>Back shortly.</h1>
        <Feedback error={error} />
        <p>Check that the API and database are running.</p>
        <button className="button" onClick={() => window.location.reload()}>
          Try again
        </button>
      </main>
    );
  if (!profile)
    return (
      <main className="loading" role="status">
        Opening the journal…
      </main>
    );
  return (
    <>
      <AnalyticsTracker enabled={!isAdmin && Boolean(profile)} />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header profile={profile} />
      <CustomCursor />
      <main id="main-content">
        <Routes>
          <Route path="/" element={<Home profile={profile} projects={projects} />} />
          <Route path="/work" element={<Work projects={projects} />} />
          <Route path="/work/:slug" element={<Project />} />
          <Route path="/about" element={<About profile={profile} />} />
          <Route path="/contact" element={<Contact profile={profile} />} />
          <Route
            path="*"
            element={
              <section className="page">
                <h1>Page not found.</h1>
                <Link to="/">Return home <Icon name="external" /></Link>
              </section>
            }
          />
        </Routes>
      </main>
      <Footer profile={profile} />
    </>
  );
}
