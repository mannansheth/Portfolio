import { createContext, useContext, useEffect, useState } from 'react';
const ThemeContext = createContext(null);
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#111312' : '#F3EBDD');
  }, [theme]);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const followSystem = (event) => {
      try {
        if (localStorage.getItem('portfolio-theme')) return;
      } catch {}
      setTheme(event.matches ? 'dark' : 'light');
    };
    const synchronize = (event) => {
      if (event.key === 'portfolio-theme')
        setTheme(
          event.newValue === 'dark' || event.newValue === 'light'
            ? event.newValue
            : media.matches
              ? 'dark'
              : 'light',
        );
    };
    media.addEventListener('change', followSystem);
    window.addEventListener('storage', synchronize);
    return () => {
      media.removeEventListener('change', followSystem);
      window.removeEventListener('storage', synchronize);
    };
  }, []);
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('portfolio-theme', next);
    } catch {}
  }
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}
export function ThemeToggle() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      aria-pressed={theme === 'dark'}
    >
      <span aria-hidden="true">{theme === 'dark' ? '☀' : '◐'}</span>
      <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );
}
