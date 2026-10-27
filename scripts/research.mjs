import fs from 'node:fs/promises';
const names = [
  'Curatus',
  'AdaptQ',
  'pathfinder',
  'recipeVerse',
  'sih2025-Reportr',
  'Affinity',
  'odrindia',
];
const get = async (path) => {
  const r = await fetch(`https://api.github.com/${path}`, {
    headers: { 'User-Agent': 'portfolio-research' },
  });
  if (!r.ok) return { error: r.status };
  return r.json();
};
await fs.mkdir('backend/data', { recursive: true });
for (const name of names) {
  const base = `repos/mannansheth/${name}`;
  const meta = await get(base),
    tree = await get(`${base}/git/trees/${meta.default_branch}?recursive=1`),
    languages = await get(`${base}/languages`);
  const paths = (tree.tree || []).filter(
    (x) => x.type === 'blob' && !/node_modules|package-lock|yarn.lock|\.env|dist\//i.test(x.path),
  );
  const chosen = paths
    .filter(
      (x) =>
        /readme|package.json|requirements.txt|app.py|server.js|routes|models|schema/i.test(
          x.path,
        ) && x.size < 25000,
    )
    .slice(0, 12);
  const files = [];
  for (const file of chosen) {
    const data = await get(`${base}/contents/${file.path}`);
    if (data.content)
      files.push({
        path: file.path,
        text: Buffer.from(data.content, 'base64').toString().slice(0, 12000),
      });
  }
  await fs.writeFile(
    `backend/data/${name}.research.json`,
    JSON.stringify(
      {
        meta: {
          name: meta.name,
          description: meta.description,
          homepage: meta.homepage,
          url: meta.html_url,
        },
        languages,
        paths: paths.map((x) => x.path).slice(0, 180),
        files,
      },
      null,
      2,
    ),
  );
  console.log(name, JSON.stringify(languages), chosen.map((x) => x.path).join(', '));
}
