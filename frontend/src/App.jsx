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
} from './components.jsx';
import Admin from './admin/Admin.jsx';
import WorkGallery from './WorkGallery.jsx';
import ProjectAtlas from './ProjectAtlas.jsx';
import PortraitReveal from './PortraitReveal.jsx';

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

function Home({ profile, projects }) {
  return (
    <>
      <section className="hero">
        <div className="hero-meta">
          <p className="eyebrow">COMPUTER ENGINEERING / CLASS OF {profile.graduationYear}</p>
          <span className="location">
            <span className="location-dot" />
            {profile.location}
          </span>
        </div>
        <h1>{profile.introduction}</h1>
        <div className="hero-bottom">
          <p>{profile.interests}</p>
          <div className="hero-links">
            <Link className="button" to="/work">
              Explore selected work <span>↘</span>
            </Link>
            <div className="inline-links">
              <External href={profile.github}>GitHub ↗</External>
              <External href={profile.linkedin}>LinkedIn ↗</External>
              <External href={profile.resumeUrl}>Resume ↗</External>
              <Link to="/contact">Contact ↗</Link>
            </div>
          </div>
        </div>
        <PortraitReveal />
        <div className="hero-folio">
          <span>COMPUTER ENGINEERING / 2028</span>
          <span>SELECTED PROJECTS</span>
          <span>BASED IN MUMBAI</span>
        </div>
      </section>
      <section className="work-section">
        <header className="folio-heading">
          <p className="folio-kicker">01 / A selection of projects</p>
          <div className="folio-heading-row">
            <h2>
              Selected <em>work.</em>
            </h2>
            <p>
              Applications, experiments,
              <br />
              and the thinking behind them.
            </p>
          </div>
        </header>
        <WorkGallery projects={projects} featured />
        <Link to="/work" className="all-work">
          Browse all projects <span>↗</span>
        </Link>
      </section>
      <section className="about-strip">
        <p className="eyebrow">02 / THE ENGINEER</p>
        <div>
          <h2>A little about me</h2>
          <p>{profile.biography.split('\n\n')[0]}</p>
          <Link className="text-link" to="/about">
            A little more about me ↗
          </Link>
        </div>
      </section>
      {profile.experience && (
        <section className="experience-highlight">
          <div>
            <p className="eyebrow">RECENT INDUSTRY PROJECT / SCIENTIFIC SCHOLAR</p>
            <h2>Finance workflows, in one place.</h2>
            <p>{profile.experience}</p>
          </div>
          <Link className="text-link" to="/about">
            More about my experience ↗
          </Link>
        </section>
      )}
      <section className="skills-section">
        <p className="eyebrow">TOOLS I USE</p>
        <Tags items={profile.skills} graphic />
      </section>
      <ContributionBoard profile={profile} />
      <section className="contact-band">
        <p className="eyebrow">03 / NEXT CONVERSATION</p>
        <h2>
          Something worth
          <br />
          building together?
        </h2>
        <Link to="/contact">
          Let’s talk <span>↗</span>
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
            {profile.resumeUrl && (
              <a href={profile.resumeUrl} download>
                Download resume ↗
              </a>
            )}
            <External href={profile.github}>GitHub ↗</External>
            <External href={profile.linkedin}>LinkedIn ↗</External>
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
            {profile.email && <a href={`mailto:${profile.email}`}>{profile.email} ↗</a>}
            <External href={profile.linkedin}>LinkedIn ↗</External>
            <External href={profile.github}>GitHub ↗</External>
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
            {busy ? 'Sending…' : 'Send message ↗'}
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
                <Link to="/">Return home ↗</Link>
              </section>
            }
          />
        </Routes>
      </main>
      <Footer profile={profile} />
    </>
  );
}
