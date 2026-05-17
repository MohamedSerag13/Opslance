const { db } = require('../db');

async function logAuditEvent({ actorUserId, actorEmail, action, resourceType, resourceId, oldValues, newValues, ipAddress, userAgent, details }) {
  await db('audit_logs').insert({
    actor_user_id: actorUserId || null,
    actor_email: actorEmail || null,
    action,
    resource_type: resourceType || null,
    resource_id: resourceId || null,
    old_values: oldValues ? JSON.stringify(oldValues) : null,
    new_values: newValues ? JSON.stringify(newValues) : null,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
    details: details || null,
  });
}

async function getAuditLogs({ page = 1, limit = 50, action, resourceType, actorUserId, startDate, endDate } = {}) {
  let query = db('audit_logs')
    .leftJoin('users', 'audit_logs.actor_user_id', 'users.id')
    .select(
      'audit_logs.*',
      'users.username as actor_username',
      'users.email as actor_email'
    )
    .orderBy('audit_logs.created_at', 'desc');

  if (action) query = query.where('audit_logs.action', action);
  if (resourceType) query = query.where('audit_logs.resource_type', resourceType);
  if (actorUserId) query = query.where('audit_logs.actor_user_id', actorUserId);
  if (startDate) query = query.where('audit_logs.created_at', '>=', startDate);
  if (endDate) query = query.where('audit_logs.created_at', '<=', endDate);

  const totalResult = await query.clone().clearSelect().clearOrder().count('* as total').first();
  const total = parseInt(totalResult.total);

  const logs = await query.offset((page - 1) * limit).limit(limit);

  return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
}

module.exports = {
  logAuditEvent,
  getAuditLogs,
};
