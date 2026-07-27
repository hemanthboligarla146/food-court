const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Verify if password matches the given hash (either Django PBKDF2 or bcrypt)
 */
function verifyPassword(password, hash) {
  if (!hash) return false;

  // Django PBKDF2 hash: pbkdf2_sha256$<iterations>$<salt>$<hash>
  if (hash.startsWith('pbkdf2_sha256$')) {
    try {
      const parts = hash.split('$');
      if (parts.length !== 4) return false;
      const [, iterationsStr, salt, hashBase64] = parts;
      const iterations = parseInt(iterationsStr, 10);
      const derivedKey = crypto.pbkdf2Sync(
        password,
        salt,
        iterations,
        32,
        'sha256'
      );
      return derivedKey.toString('base64') === hashBase64;
    } catch (err) {
      console.error('Django PBKDF2 verification failed:', err);
      return false;
    }
  }

  // Fallback to standard bcrypt
  try {
    return bcrypt.compareSync(password, hash);
  } catch (err) {
    return false;
  }
}

/**
 * Hash a password using standard bcrypt
 */
function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

module.exports = {
  verifyPassword,
  hashPassword
};
