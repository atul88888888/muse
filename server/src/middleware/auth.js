const { verifyToken } = require('../lib/auth');

// Every authenticated request gets req.tenantId / req.userId / req.role from the
// verified JWT - routes must always scope Prisma queries with req.tenantId.
// Never trust a tenantId from the request body or query string.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  try {
    const payload = verifyToken(token);
    if (payload.kind === 'preview') {
      return res.status(401).json({ error: 'Invalid token for this endpoint' });
    }
    req.tenantId = payload.tenantId;
    req.userId = payload.userId;
    req.role = payload.role;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
