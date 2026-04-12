const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, hash) {
  const [salt, stored] = String(hash || '').split(':');
  if (!salt || !stored) {
    return false;
  }

  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  const storedBuffer = Buffer.from(stored, 'hex');
  const derivedBuffer = Buffer.from(derived, 'hex');

  if (storedBuffer.length !== derivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuffer, derivedBuffer);
}

module.exports = { hashPassword, verifyPassword };
