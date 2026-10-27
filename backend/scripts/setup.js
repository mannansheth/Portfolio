import fs from 'node:fs/promises';
import { query, pool } from '../src/db.js';
import { profile, projects } from '../data/seed.js';
import { saveProject } from '../src/projects.js';
try {
  const schema = await fs.readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  for (const statement of schema
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean))
    await query(statement);
  await query('INSERT IGNORE INTO profile (id,data) VALUES (1,?)', [JSON.stringify(profile)]);
  for (const project of projects) {
    const rows = await query('SELECT id FROM projects WHERE repository_key=?', [
      `${project.githubOwner}/${project.githubRepo}`.toLowerCase(),
    ]);
    if (!rows.length) await saveProject(project);
  }
  console.log(
    'Schema ready. Six curated project summaries are available; existing content was preserved.',
  );
} catch (e) {
  console.error('Setup failed:', e.code || e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
