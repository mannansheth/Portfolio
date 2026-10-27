import readline from 'node:readline/promises';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, pool } from '../src/db.js';
import { Writable } from 'node:stream';
let muted = false;
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) process.stdout.write(chunk);
    callback();
  },
});
const rl = readline.createInterface({
  input: process.stdin,
  output,
  terminal: true,
});
try {
  const email = z.email().parse((await rl.question('Administrator email: ')).trim().toLowerCase());
  process.stdout.write('Password (12+ characters; hidden): ');
  muted = true;
  const password = await rl.question('');
  muted = false;
  process.stdout.write('\n');
  if (password.length < 12 || Buffer.byteLength(password) > 72)
    throw new Error('Use a password of at least 12 characters and at most 72 UTF-8 bytes.');
  await query('INSERT INTO administrators (email,password_hash) VALUES (?,?)', [
    email,
    await bcrypt.hash(password, 12),
  ]);
  console.log('Administrator created. Sign in at /admin.');
} catch (e) {
  console.error('Administrator setup failed:', e.code || e.message);
  process.exitCode = 1;
} finally {
  rl.close();
  await pool.end();
}
