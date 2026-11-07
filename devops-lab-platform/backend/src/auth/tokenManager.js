const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      organization_id: user.organization_id,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

async function createRefreshToken(userId, token, userAgent, ipAddress) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + parseExpiry(REFRESH_TOKEN_EXPIRY));
  const [row] = await db('refresh_tokens').insert({
    user_id: userId,
    token_hash: tokenHash,
    user_agent: userAgent,
    ip_address: ipAddress,
    expires_at: expiresAt,
  }).returning('id');
  const id = row?.id || row;

  return id;
}

async function verifyRefreshToken(token) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const record = await db('refresh_tokens')
    .join('users', 'refresh_tokens.user_id', 'users.id')
    .where('refresh_tokens.token_hash', tokenHash)
    .whereNull('refresh_tokens.revoked_at')
    .where('refresh_tokens.expires_at', '>', new Date())
    .where('users.is_active', true)
    .whereNull('users.deleted_at')
    .select('refresh_tokens.*', 'users.*')
    .first();

  if (!record) return null;
  return record;
}

async function revokeRefreshToken(token) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await db('refresh_tokens')
    .where({ token_hash: tokenHash })
    .update({ revoked_at: db.fn.now() });
}

async function revokeAllUserTokens(userId) {
  await db('refresh_tokens')
    .where({ user_id: userId })
    .whereNull('revoked_at')
    .update({ revoked_at: db.fn.now() });
}

async function cleanupExpiredTokens() {
  const result = await db('refresh_tokens')
    .where('expires_at', '<', new Date())
    .orWhereNotNull('revoked_at')
    .where('created_at', '<', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    .delete();
  return result;
}

function parseExpiry(expiryStr) {
  const match = expiryStr.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return value * (multipliers[unit] || multipliers.d);
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  createRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanupExpiredTokens,
  verifyAccessToken,
  JWT_SECRET,
};
