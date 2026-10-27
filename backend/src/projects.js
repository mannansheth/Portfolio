import { query } from './db.js';
import { HttpError, projectSchema } from './validation.js';
import { parseRepository } from './github.js';
export const json = (value) => (typeof value === 'string' ? JSON.parse(value) : value);
export function projectRow(row) {
  return {
    ...json(row.data),
    id: row.id,
    slug: row.slug,
    status: row.status,
    featured: !!row.featured,
    position: row.position,
    version: row.version,
    updatedAt: row.updated_at,
  };
}
export function publicProject(project) {
  const { missingInformation, suggestedSections, privatePublicationApproved, ...publicFields } =
    project;
  return project.repositoryPrivate
    ? { ...publicFields, repositoryUrl: '', githubOwner: '', githubRepo: '' }
    : publicFields;
}
export async function listProjects(publicOnly = false) {
  return (
    await query(
      `SELECT * FROM projects ${publicOnly ? "WHERE status='published'" : ''} ORDER BY position, id`,
    )
  ).map((row) => (publicOnly ? publicProject(projectRow(row)) : projectRow(row)));
}
export async function saveProject(body, id) {
  const p = projectSchema.parse(body);
  if (id) {
    const rows = await query('SELECT data FROM projects WHERE id=?', [id]);
    if (!rows.length) throw new HttpError(404, 'Project not found.');
    p.repositoryPrivate = p.repositoryPrivate || Boolean(json(rows[0].data).repositoryPrivate);
  }
  if (p.repositoryPrivate && p.status === 'published' && !p.privatePublicationApproved)
    throw new HttpError(
      400,
      'Review the private project and approve making its portfolio descriptions public before publishing. The repository link stays hidden.',
    );
  let key = null;
  if (p.repositoryUrl) {
    const gh = parseRepository(p.repositoryUrl);
    p.githubOwner = gh.owner;
    p.githubRepo = gh.repo;
    key = `${gh.owner}/${gh.repo}`.toLowerCase();
  }
  const values = [p.slug, p.status, p.featured, p.position, key, JSON.stringify(p)];
  if (id) {
    if (!p.version) throw new HttpError(400, 'A content version is required.');
    const result = await query(
      'UPDATE projects SET slug=?,status=?,featured=?,position=?,repository_key=?,data=?,version=version+1 WHERE id=? AND version=?',
      [...values, id, p.version],
    );
    if (!result.affectedRows)
      throw new HttpError(409, 'This project changed or was deleted. Reload before editing.');
  } else {
    const result = await query(
      'INSERT INTO projects (slug,status,featured,position,repository_key,data) VALUES (?,?,?,?,?,?)',
      values,
    );
    id = result.insertId;
  }
  return projectRow((await query('SELECT * FROM projects WHERE id=?', [id]))[0]);
}
