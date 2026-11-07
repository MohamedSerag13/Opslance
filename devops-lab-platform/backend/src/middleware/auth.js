const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

function requireOrgMatch(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const targetOrgId = req.body?.organization_id || req.params?.organizationId;
  if (targetOrgId && req.user.organization_id !== targetOrgId && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Cross-organization access denied' });
  }
  next();
}

module.exports = { authMiddleware, requireRole, requireOrgMatch };
