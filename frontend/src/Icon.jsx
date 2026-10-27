export function Icon({ name = 'external', className = '' }) {
  const common = {
    className: `ui-icon ui-icon-${name} ${className}`.trim(),
    viewBox: '0 0 24 24',
    fill: name === 'star' ? 'currentColor' : 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: 'false',
  };
  const paths = {
    external: <><path d="M13 5h6v6" /><path d="m19 5-9 9" /><path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>,
    left: <><path d="m14 18-6-6 6-6" /><path d="M8 12h12" /></>,
    right: <><path d="m10 18 6-6-6-6" /><path d="M4 12h12" /></>,
    up: <><path d="m18 15-6-6-6 6" /><path d="M12 9v11" /></>,
    down: <><path d="m6 9 6 6 6-6" /><path d="M12 15V4" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    minus: <path d="M5 12h14" />,
    star: <path d="m12 3 2.75 5.58 6.16.9-4.45 4.33 1.05 6.13L12 17.05l-5.51 2.89 1.05-6.13L3.1 9.48l6.15-.9L12 3Z" />,
  };
  if (name === 'sun')
    return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>;
  if (name === 'moon')
    return <svg {...common}><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" /></svg>;
  return <svg {...common}>{paths[name] || paths.external}</svg>;
}
