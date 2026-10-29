import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, setCsrf } from '../api.js';
import { Field, Feedback, Icon } from '../components.jsx';
import ProjectEditor, { emptyProject } from './ProjectEditor.jsx';
import Importer from './Importer.jsx';
import ProfileEditor from './ProfileEditor.jsx';
import Messages from './Messages.jsx';
import Analytics from './Analytics.jsx';
import { ThemeToggle } from '../Theme.jsx';
export default function Admin({ onProfileChange }) {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const adminPath = location.pathname.replace(/\/+$/, '') || '/admin';
  const editRoute = adminPath.match(/^\/admin\/projects\/(new|\d+)$/);
  const routeViews = {
    '/admin': 'dashboard',
    '/admin/analytics': 'analytics',
    '/admin/projects': 'projects',
    '/admin/import': 'import',
    '/admin/profile': 'profile',
    '/admin/messages': 'messages',
  };
  const view = routeViews[adminPath] || (editRoute ? 'projects' : 'dashboard');
  const [session, setSession] = useState(null),
    [checking, setChecking] = useState(true),
    [adminMenuOpen, setAdminMenuOpen] = useState(false),
    [projects, setProjects] = useState([]),
    [projectsLoading, setProjectsLoading] = useState(true),
    [editor, setEditor] = useState(null),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [remove, setRemove] = useState(null);
  useEffect(() => {
    api('/auth/session')
      .then((s) => {
        setCsrf(s.csrfToken);
        setSession(s);
      })
      .catch((e) => {
        if (e.status !== 401) setError(e.message);
      })
      .finally(() => setChecking(false));
  }, []);
  async function loadProjects() {
    setProjectsLoading(true);
    try {
      setProjects(await api('/admin/projects'));
    } catch (e) {
      setError(e.message);
      if (e.status === 401) {
        setSession(null);
        setCsrf('');
      }
    } finally {
      setProjectsLoading(false);
    }
  }
  useEffect(() => {
    if (session) loadProjects();
  }, [session]);
  useEffect(() => setAdminMenuOpen(false), [location.pathname]);
  useEffect(() => {
    if (!checking && session && !routeViews[adminPath] && !editRoute)
      routerNavigate('/admin', { replace: true });
  }, [adminPath, checking, session]);
  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const s = await api('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      setCsrf(s.csrfToken);
      setSession(s);
      setPassword('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError('');
    try {
      await api('/auth/logout', { method: 'POST', body: {} });
      setSession(null);
      setCsrf('');
      setEditor(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function navigate(next) {
    setEditor(null);
    routerNavigate(next === 'dashboard' ? '/admin' : `/admin/${next}`);
    setError('');
    setMessage('');
    setRemove(null);
  }
  function openProjectEditor(project) {
    setEditor(project);
    routerNavigate(`/admin/projects/${project.id || 'new'}`);
    setError('');
    setMessage('');
    setRemove(null);
  }
  async function reorder(index, direction) {
    const next = [...projects],
      other = index + direction;
    [next[index], next[other]] = [next[other], next[index]];
    setBusy(true);
    setError('');
    try {
      setProjects(
        await api('/admin/reorder', {
          method: 'POST',
          body: { items: next.map((p) => ({ id: p.id, version: p.version })) },
        }),
      );
      setMessage('Project order saved.');
    } catch (e) {
      setError(e.message);
      await loadProjects();
    } finally {
      setBusy(false);
    }
  }
  async function toggle(p, key) {
    if (
      key === 'status' &&
      p.status === 'draft' &&
      p.repositoryPrivate &&
      !p.privatePublicationApproved
    ) {
      setEditor(p);
      setMessage('Review and approve publishing this private project in the editor.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api(`/admin/projects/${p.id}`, {
        method: 'PUT',
        body: {
          ...p,
          [key]: key === 'status' ? (p.status === 'draft' ? 'published' : 'draft') : !p.featured,
        },
      });
      await loadProjects();
      setMessage('Project updated.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function deleteProject() {
    setBusy(true);
    setError('');
    try {
      await api(`/admin/projects/${remove.id}`, {
        method: 'DELETE',
        body: { version: remove.version },
      });
      setRemove(null);
      await loadProjects();
      setMessage('Project deleted.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (checking) return <main className="loading">Checking your session…</main>;
  if (!session)
    return (
      <main className="login-page">
        <div className="login-theme">
          <ThemeToggle />
        </div>
        <Link className="wordmark" to="/">
          Mannan Sheth <span className="mark"><Icon name="external" /></span>
        </Link>
        <div className="login-panel">
          <p className="eyebrow">THE EDITOR’S DESK</p>
          <h1>Welcome back.</h1>
          <p>Sign in to maintain your portfolio.</p>
          <form onSubmit={login}>
            <Field
              label="Email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={setEmail}
              required
            />
            <Field
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              required
            />
            <button className="button" disabled={busy}>
              {busy ? 'Signing in…' : <>Sign in <Icon name="external" /></>}
            </button>
            <Feedback error={error} />
          </form>
          <p className="form-note">
            First visit? Create an administrator with the setup command in the README.
          </p>
        </div>
        <Link to="/"><Icon name="left" /> Return to portfolio</Link>
      </main>
    );
  const editorMatchesRoute = editRoute && editor && (editRoute[1] === 'new'
    ? !editor.id
    : String(editor.id) === editRoute[1]);
  const activeEditor = editRoute
    ? editorMatchesRoute
      ? editor
      : editRoute[1] === 'new'
        ? { ...emptyProject, position: projects.length }
        : projects.find((project) => String(project.id) === editRoute[1])
    : null;
  const published = projects.filter((p) => p.status === 'published').length;
  return (
    <div className="admin-shell">
      <a className="skip-link" href="#admin-main">
        Skip to editor
      </a>
      <aside className={`admin-sidebar${adminMenuOpen ? ' menu-open' : ''}`}>
        <div className="admin-sidebar-top">
          <Link className="wordmark" to="/">
            Mannan Sheth<span className="mark"><Icon name="external" /></span>
          </Link>
          <button
            className="admin-menu-toggle"
            type="button"
            aria-expanded={adminMenuOpen}
            aria-controls="admin-navigation-panel"
            onClick={() => setAdminMenuOpen((open) => !open)}
          >
            {adminMenuOpen ? 'Close' : 'Menu'} <Icon name={adminMenuOpen ? 'minus' : 'plus'} />
          </button>
        </div>
        <div id="admin-navigation-panel" className="admin-sidebar-content">
          <p className="eyebrow">THE EDITOR’S DESK</p>
          <ThemeToggle />
          <nav aria-label="Admin navigation">
            {[
              ['dashboard', 'Overview'],
              ['analytics', 'Analytics'],
              ['projects', 'Projects'],
              ['import', 'GitHub import'],
              ['profile', 'Profile & links'],
              ['messages', 'Messages'],
            ].map(([key, label]) => (
              <button
                className={view === key && !activeEditor ? 'active' : ''}
                key={key}
                onClick={() => navigate(key)}
              >
                {label}
                <Icon name="external" />
              </button>
            ))}
          </nav>
          <div className="admin-account">
            <small>{session.email}</small>
            <button disabled={busy} onClick={logout}>
              Sign out <Icon name="external" />
            </button>
            <Link to="/" target="_blank">
              View portfolio <Icon name="external" />
            </Link>
          </div>
        </div>
      </aside>
      <main id="admin-main" className="admin-main">
        <Feedback error={error} message={message} />
        {activeEditor ? (
          <ProjectEditor
            key={activeEditor.id || activeEditor.repositoryUrl || 'new'}
            initial={activeEditor}
            onSave={(saved) => {
              if (saved?.id) {
                setEditor(saved);
                routerNavigate(`/admin/projects/${saved.id}`, { replace: true });
              }
              loadProjects();
            }}
            onCancel={() => {
              setEditor(null);
              loadProjects();
              navigate('projects');
            }}
          />
        ) : view === 'profile' ? (
          <ProfileEditor onProfileChange={onProfileChange} />
        ) : view === 'messages' ? (
          <Messages />
        ) : view === 'analytics' ? (
          <Analytics />
        ) : view === 'import' ? (
          <Importer
            onDraft={openProjectEditor}
            onExisting={(id) => {
              const project = projects.find((p) => p.id === id);
              if (project) openProjectEditor(project);
            }}
          />
        ) : (
          <>
            <div className="admin-title">
              <div>
                <p className="eyebrow">
                  {view === 'dashboard' ? 'CONTENT AT A GLANCE' : 'THE PROJECT INDEX'}
                </p>
                <h1>{view === 'dashboard' ? 'Make it yours.' : 'Manage projects.'}</h1>
              </div>
              <button
                className="button"
                disabled={projectsLoading}
                onClick={() => openProjectEditor({ ...emptyProject, position: projects.length })}
              >
                New project <Icon name="plus" />
              </button>
            </div>
            {view === 'dashboard' && (
              <>
                <p className="admin-intro">
                  A working journal, kept current. Review your project drafts, publish the strongest
                  work, and keep the details personal.
                </p>
                <div className="stats">
                  <div>
                    <strong>{published}</strong>
                    <span>Published projects</span>
                  </div>
                  <div>
                    <strong>{projects.length - published}</strong>
                    <span>Drafts to review</span>
                  </div>
                  <div>
                    <strong>
                      {projects.filter((p) => p.featured && p.status === 'published').length}
                    </strong>
                    <span>Featured on homepage</span>
                  </div>
                </div>
                <div className="dashboard-shortcuts">
                  <button onClick={() => navigate('import')}>
                    <span>01 / SOURCE</span>
                    <strong>Bring in a repository <Icon name="external" /></strong>
                    <p>Inspect public code and build an editable draft.</p>
                  </button>
                  <button onClick={() => navigate('profile')}>
                    <span>02 / CONTEXT</span>
                    <strong>Update your profile <Icon name="external" /></strong>
                    <p>Add your contact details, resume, and personal context.</p>
                  </button>
                </div>
              </>
            )}
            {remove && (
              <div className="review-box" role="alert">
                <h2>Delete {remove.title}?</h2>
                <p>This removes the portfolio record. The GitHub repository is unaffected.</p>
                <div className="actions">
                  <button className="danger" disabled={busy} onClick={deleteProject}>
                    Delete project
                  </button>
                  <button onClick={() => setRemove(null)}>Cancel</button>
                </div>
              </div>
            )}
            <div className="project-table">
              {projectsLoading && <p role="status">Loading project notes…</p>}
              <div className="table-heading">
                <h2>{view === 'dashboard' ? 'Your project notes' : 'Projects'}</h2>
                <span>{projects.length} entries</span>
              </div>
              {projects.map((p, i) => (
                <article key={p.id} className="admin-project">
                  <div className="order-controls">
                    <button
                      aria-label={`Move ${p.title} up`}
                      disabled={busy || i === 0}
                      onClick={() => reorder(i, -1)}
                    >
                      <Icon name="up" />
                    </button>
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    <button
                      aria-label={`Move ${p.title} down`}
                      disabled={busy || i === projects.length - 1}
                      onClick={() => reorder(i, 1)}
                    >
                      <Icon name="down" />
                    </button>
                  </div>
                  <div className="admin-project-name">
                    <button onClick={() => openProjectEditor(p)}>{p.title}</button>
                    <small>/{p.slug}</small>
                  </div>
                  <span className={`status-badge ${p.status}`}>{p.status}</span>
                  <button
                    className="feature-toggle"
                    disabled={busy}
                    aria-pressed={p.featured}
                    onClick={() => toggle(p, 'featured')}
                  >
                    <><Icon name="star" /> {p.featured ? 'Featured' : 'Feature'}</>
                  </button>
                  <div className="actions">
                    <button onClick={() => openProjectEditor(p)}>Edit</button>
                    <button disabled={busy} onClick={() => toggle(p, 'status')}>
                      {p.status === 'draft' ? 'Publish' : 'Unpublish'}
                    </button>
                    <button className="delete-link" onClick={() => setRemove(p)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
              {!projects.length && (
                <p className="empty">No projects yet. Create one or import a public repository.</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
