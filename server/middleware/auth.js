const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'bit_central_library_super_secret_jwt_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token. Please log in again.' });
    }
    req.user = user;
    next();
  });
}

function requireRole(roleOrRoles) {
  const allowed = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: requires one of [${allowed.join(', ')}] privileges.` });
    }
    next();
  };
}

const requireLibrarian = requireRole(['LIBRARIAN', 'ADMIN']);

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireRole,
  requireLibrarian
};
