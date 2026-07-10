import crypto from 'crypto';

const secret = process.env.JWT_SECRET || 'dev-secret';

export async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, 'collab-editor-salt', 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey.toString('hex'));
    });
  });
}

export async function verifyPassword(password, storedPasswordHash) {
  const passwordHash = await hashPassword(password);
  return passwordHash === storedPasswordHash;
}

export function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(jwtToken) {
  const [header, body, signature] = jwtToken.split('.');
  const expectedSignature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');

  if (signature !== expectedSignature) {
    throw new Error('Invalid token');
  }

  return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
}
