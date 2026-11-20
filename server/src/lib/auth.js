const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set');
}

function signToken(user) {
  return jwt.sign(
    { userId: user.id, tenantId: user.tenantId, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Separate, short-lived, narrow-purpose token for sharing a single track preview
// with an outside buyer who has no account on the platform.
function signPreviewToken(tenantId, trackId) {
  return jwt.sign({ tenantId, trackId, kind: 'preview' }, JWT_SECRET, { expiresIn: '30d' });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { signToken, signPreviewToken, verifyToken };
