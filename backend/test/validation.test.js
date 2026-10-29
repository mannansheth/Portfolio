import test from 'node:test';
import assert from 'node:assert/strict';
import { projectSchema } from '../src/validation.js';

test('project gallery accepts same-site image assets shipped with the frontend', () => {
  const result = projectSchema.safeParse({
    title: 'Pathfinder',
    slug: 'pathfinder',
    images: ['/images/work/pathfinder.png'],
  });

  assert.equal(result.success, true);
});

test('project gallery rejects same-site paths that escape the public asset root', () => {
  const result = projectSchema.safeParse({
    title: 'Pathfinder',
    slug: 'pathfinder',
    images: ['/images/../backend/.env'],
  });

  assert.equal(result.success, false);
});
