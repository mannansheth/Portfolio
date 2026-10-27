(() => {
  let preference;
  try {
    preference = localStorage.getItem('portfolio-theme');
  } catch {}
  const theme =
    preference === 'dark' || preference === 'light'
      ? preference
      : matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
  document.documentElement.dataset.theme = theme;
})();
