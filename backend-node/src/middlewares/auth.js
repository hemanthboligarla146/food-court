const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'django-insecure-5vboyrda1qm*e%g+u3+q2w9_c#01z5vwa^v+s-6tr5f-9-9xik';

/**
 * Middleware to authenticate JWT token from headers
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ detail: 'Given token not valid for any token type', code: 'token_not_valid' });
    }

    try {
      // Django user ID in SimpleJWT payload is stored in 'user_id' key
      const userId = decoded.user_id || decoded.id;
      if (!userId) {
        req.user = null;
        return next();
      }

      const user = await prisma.users_user.findUnique({
        where: { id: BigInt(userId) }
      });

      if (!user || !user.is_active) {
        return res.status(401).json({ detail: 'User not active or deleted' });
      }

      req.user = user;
      next();
    } catch (dbErr) {
      console.error('Authentication DB lookup failed:', dbErr);
      res.status(500).json({ detail: 'Internal server error during authentication' });
    }
  });
}

/**
 * Middleware to strictly enforce authenticated user access
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ detail: 'Authentication credentials were not provided.' });
  }
  next();
}

/**
 * Middleware to check if user has admin privileges
 */
function isAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ detail: 'Authentication credentials were not provided.' });
  }
  
  if (!req.user.is_staff && !req.user.is_superuser) {
    return res.status(403).json({ detail: 'You do not have permission to perform this action.' });
  }
  
  next();
}

module.exports = {
  authenticateToken,
  requireAuth,
  isAdmin
};
