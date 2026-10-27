import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Field, Feedback } from '../components.jsx';
export default function ProfileEditor({ onProfileChange }) {
  const [profile, setProfile] = useState(null),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api('/profile')
      .then(setProfile)
      .catch((e) => setError(e.message));
  }, []);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const p = await api('/admin/profile', {
        method: 'PUT',
        body: { ...profile, skills: profile.skills.filter((x) => x.trim()) },
      });
      setProfile(p);
      onProfileChange(p);
      setMessage('Portfolio profile saved. Changes are live.');
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
  const change = (key, value) => setProfile((p) => ({ ...p, [key]: value }));
  return (
    <>
      <p className="eyebrow">YOUR PUBLIC PROFILE</p>
      <h1>Words & details.</h1>
      <Feedback error={error} message={message} />
      {profile ? (
        <form onSubmit={save} className="profile-form">
          <div className="form-grid">
            {[
              ['name', 'Full name'],
              ['location', 'Location'],
              ['graduationYear', 'Graduation year'],
            ].map(([k, l]) => (
              <Field
                key={k}
                label={l}
                value={profile[k]}
                onChange={(v) => change(k, v)}
                required={k === 'name'}
              />
            ))}
          </div>
          {[
            ['introduction', 'Homepage introduction'],
            ['interests', 'Professional interests'],
            ['biography', 'Biography'],
            ['education', 'Education'],
            ['experience', 'Experience'],
          ].map(([k, l]) => (
            <Field
              key={k}
              label={l}
              multiline
              rows={k === 'biography' ? 6 : 3}
              value={profile[k]}
              onChange={(v) => change(k, v)}
              required={k === 'introduction'}
            />
          ))}
          <Field
            label="Skills"
            multiline
            rows={5}
            value={profile.skills.join('\n')}
            onChange={(v) => change('skills', v.split('\n'))}
            hint="One skill per line."
          />
          <div className="form-grid">
            {[
              ['github', 'GitHub URL'],
              ['linkedin', 'LinkedIn URL'],
              ['resumeUrl', 'Resume URL'],
              ['email', 'Public contact email'],
            ].map(([k, l]) => (
              <Field
                key={k}
                label={l}
                value={profile[k]}
                type={k === 'email' ? 'email' : k === 'resumeUrl' ? 'text' : 'url'}
                hint={
                  k === 'resumeUrl' ? 'Use /resume.pdf for a PDF included in this site.' : undefined
                }
                onChange={(v) => change(k, v)}
              />
            ))}
          </div>
          <p className="form-note">
            Empty optional links are hidden on the public site. A resume can use a hosted URL or a
            site path such as /resume.pdf.
          </p>
          <button className="button" disabled={busy}>
            {busy ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      ) : (
        <p role="status">Loading profile…</p>
      )}
    </>
  );
}
