import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, createToken, verifyToken } from '../src/utils/auth.js';

test('password hashing and verification work', async () => {
  const password = 'super-secret';
  const hashedPassword = await hashPassword(password);

  assert.notEqual(hashedPassword, password);
  assert.equal(await verifyPassword(password, hashedPassword), true);
  assert.equal(await verifyPassword('wrong', hashedPassword), false);
});

test('tokens can be created and verified', () => {
  const authToken = createToken({ id: 'user-123', username: 'ada' });
  const payload = verifyToken(authToken);

  assert.equal(payload.username, 'ada');
  assert.equal(payload.id, 'user-123');
});
