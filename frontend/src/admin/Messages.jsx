import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Feedback } from '../components.jsx';
export default function Messages() {
  const [items, setItems] = useState(null),
    [error, setError] = useState('');
  useEffect(() => {
    api('/admin/contacts')
      .then(setItems)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <p className="eyebrow">CONTACT INBOX</p>
      <h1>Conversations.</h1>
      <p>The latest 200 messages are stored here, even when email delivery is not configured.</p>
      <Feedback error={error} />
      {items ? (
        items.length ? (
          items.map((m) => (
            <article className="panel message-item" key={m.id}>
              <p className="eyebrow">
                {new Date(m.created_at).toLocaleString()} / EMAIL: {m.delivery_status}
              </p>
              <h2>{m.name}</h2>
              <a href={`mailto:${m.email}`}>{m.email}</a>
              <p className="prose">{m.message}</p>
            </article>
          ))
        ) : (
          <p className="empty">No messages yet.</p>
        )
      ) : (
        <p role="status">Loading messages…</p>
      )}
    </>
  );
}
