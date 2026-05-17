const { db } = require('../db');
const { logAuditEvent } = require('../audit/auditLogger');
const {
  generateAccessToken,
  generateRefreshToken,
  createRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} = require('../auth/tokenManager');
const { cacheSet, cacheDel } = require('../cache/redis');

const bcrypt = require('bcrypt');

function setupAuthRoutes(app) {
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const user = await db('users')
        .where({ username })
        .orWhere({ email: username })
        .whereNull('deleted_at')
        .first();

      if (!user || !user.is_active) {
        await logAuditEvent({
          actorEmail: username,
          action: 'login_failed',
          resourceType: 'user',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          details: 'Invalid credentials or inactive account',
        });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        await logAuditEvent({
          actorUserId: user.id,
          actorEmail: user.email,
          action: 'login_failed',
          resourceType: 'user',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          details: 'Invalid password',
        });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      await db('users').where({ id: user.id }).update({ last_active_at: db.fn.now() });

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken();

      await createRefreshToken(user.id, refreshToken, req.headers['user-agent'], req.ip);

      await logAuditEvent({
        actorUserId: user.id,
        actorEmail: user.email,
        action: 'login_success',
        resourceType: 'user',
        resourceId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/auth/refresh',
      });

      res.json({
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          organization_id: user.organization_id,
        },
        mustChangePassword: user.must_change_password === true,
      });
    } catch (err) {
      console.error('[AUTH] Login error:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

      const record = await verifyRefreshToken(refreshToken);
      if (!record) return res.status(401).json({ error: 'Invalid or expired refresh token' });

      const user = {
        id: record.id,
        email: record.email,
        role: record.role,
        organization_id: record.organization_id,
      };

      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken();

      await revokeRefreshToken(refreshToken);
      await createRefreshToken(record.id, newRefreshToken, req.headers['user-agent'], req.ip);

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/auth/refresh',
      });

      res.json({ accessToken: newAccessToken });
    } catch (err) {
      console.error('[AUTH] Refresh error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) await revokeRefreshToken(refreshToken);
      res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

      const token = authHeader.split(' ')[1];
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key';

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await db('users')
          .select('id', 'username', 'email', 'role', 'organization_id', 'avatar_url', 'streak_count', 'last_active_at')
          .where({ id: decoded.id })
          .whereNull('deleted_at')
          .first();

        if (!user) return res.status(401).json({ error: 'User not found' });
        res.json({ user });
      } catch {
        res.status(401).json({ error: 'Invalid token' });
      }
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/accept-invitation', async (req, res) => {
    try {
      const { token, username, email, password } = req.body;
      if (!token || !username || !email || !password) {
        return res.status(400).json({ error: 'All fields required' });
      }

      const invitation = await db('invitations')
        .where({ token })
        .whereNull('deleted_at')
        .where('expires_at', '>', new Date())
        .whereNull('accepted_at')
        .first();

      if (!invitation) return res.status(400).json({ error: 'Invalid or expired invitation' });

      const emailExists = await db('users').where({ email, organization_id: invitation.organization_id }).whereNull('deleted_at').first();
      if (emailExists) return res.status(400).json({ error: 'Email already registered' });

      const usernameExists = await db('users').where({ username, organization_id: invitation.organization_id }).whereNull('deleted_at').first();
      if (usernameExists) return res.status(400).json({ error: 'Username already taken' });

      const hash = await bcrypt.hash(password, 12);
      const [row] = await db('users').insert({
        organization_id: invitation.organization_id,
        username,
        email,
        password_hash: hash,
        role: invitation.role,
        is_active: true,
        email_verified_at: db.fn.now(),
      }).returning('id');
      const userId = row.id || row;

      await db('invitations').where({ id: invitation.id }).update({
        accepted_at: db.fn.now(),
        accepted_by_user_id: userId,
      });

      await logAuditEvent({
        actorUserId: userId,
        actorEmail: email,
        action: 'user_registered_via_invitation',
        resourceType: 'user',
        resourceId: userId,
        ipAddress: req.ip,
      });

      res.json({ success: true, message: 'Account created successfully' });
    } catch (err) {
      console.error('[AUTH] Invitation accept error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/change-password', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

      const token = authHeader.split(' ')[1];
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key';

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
          return res.status(400).json({ error: 'Current password and new password required' });
        }

        if (newPassword.length < 8) {
          return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const user = await db('users').where({ id: decoded.id }).whereNull('deleted_at').first();
        if (!user) return res.status(404).json({ error: 'User not found' });

        const valid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

        const hash = await bcrypt.hash(newPassword, 12);
        await db('users').where({ id: user.id }).update({
          password_hash: hash,
          must_change_password: false,
          updated_at: db.fn.now(),
        });

        await logAuditEvent({
          actorUserId: user.id,
          action: 'password_changed',
          resourceType: 'user',
          resourceId: user.id,
          ipAddress: req.ip,
        });

        res.json({ success: true, message: 'Password changed successfully' });
      } catch {
        res.status(401).json({ error: 'Invalid token' });
      }
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = await db('users').where({ email }).whereNull('deleted_at').first();
    res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
  });
}

module.exports = { setupAuthRoutes };
