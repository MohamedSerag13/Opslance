const { db } = require('../db');
const { logAuditEvent } = require('../audit/auditLogger');
const { cacheDel, cacheDelPattern } = require('../cache/redis');
const bcrypt = require('bcrypt');

function setupAdminRoutes(app) {
  app.get('/api/admin/dashboard', async (req, res) => {
    try {
      const [totalUsers, activeUsers, totalLabs, runningEnvs, totalSubmissions, completions] = await Promise.all([
        db('users').whereNull('deleted_at').count('* as total').first(),
        db('users').whereNull('deleted_at').whereNotNull('last_active_at').where('last_active_at', '>', db.raw("NOW() - INTERVAL '7 days'")).count('* as total').first(),
        db('labs').whereNull('deleted_at').count('* as total').first(),
        db('user_environments').where({ container_status: 'running' }).count('* as total').first(),
        db('submissions').whereNull('deleted_at').count('* as total').first(),
        db('user_lab_progress').where({ status: 'completed' }).whereNull('deleted_at').count('* as total').first(),
      ]);

      const dailyActive = await db.raw(`
        SELECT DATE(last_active_at) as date, count(*) as count
        FROM users
        WHERE last_active_at > NOW() - INTERVAL '30 days'
        AND deleted_at IS NULL
        GROUP BY DATE(last_active_at)
        ORDER BY date ASC
      `);

      const hostStats = await db.raw(`
        SELECT
          count(*) FILTER (WHERE container_status = 'running') as running_containers,
          count(*) as total_environments
        FROM user_environments
        WHERE deleted_at IS NULL
      `);

      res.json({
        total_users: parseInt(totalUsers.total),
        active_users_7d: parseInt(activeUsers.total),
        total_labs: parseInt(totalLabs.total),
        running_environments: parseInt(runningEnvs.total),
        total_submissions: parseInt(totalSubmissions.total),
        total_completions: parseInt(completions.total),
        daily_active: dailyActive.rows,
        host_stats: hostStats.rows[0],
      });
    } catch (err) {
      console.error('[ADMIN] Dashboard error:', err);
      res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
  });

  app.get('/api/admin/users', async (req, res) => {
    try {
      const { page = 1, limit = 50, search, role, cohort_id } = req.query;
      let query = db('users')
        .leftJoin('cohort_members', function() {
          this.on('users.id', 'cohort_members.user_id').andOnNull('cohort_members.left_at');
        })
        .whereNull('users.deleted_at')
        .select('users.*')
        .count('cohort_members.id as cohort_count');

      if (search) query = query.where(function() {
        this.where('users.username', 'ilike', `%${search}%`)
            .orWhere('users.email', 'ilike', `%${search}%`);
      });
      if (role) query = query.where('users.role', role);
      if (cohort_id) query = query.where('cohort_members.cohort_id', cohort_id);

      query.groupBy('users.id').orderBy('users.created_at', 'desc');

      const totalResult = await query.clone().countDistinct('users.id as total').first();
      const total = parseInt(totalResult.total);

      const users = await query.offset((page - 1) * limit).limit(limit);

      for (const user of users) {
        const pointsRes = await db('user_lab_progress')
          .where({ user_id: user.id, status: 'completed' })
          .whereNull('deleted_at')
          .sum('score_awarded as total').first();
        user.total_points = parseInt(pointsRes?.total || 0);

        const completedRes = await db('user_lab_progress')
          .where({ user_id: user.id, status: 'completed' })
          .whereNull('deleted_at')
          .count('* as total').first();
        user.labs_completed = parseInt(completedRes?.total || 0);
      }

      res.json({ users, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.get('/api/admin/users/:id', async (req, res) => {
    try {
      const user = await db('users')
        .where({ id: req.params.id })
        .whereNull('deleted_at')
        .first();
      if (!user) return res.status(404).json({ error: 'User not found' });

      const progress = await db('user_lab_progress')
        .join('labs', 'user_lab_progress.lab_id', 'labs.id')
        .leftJoin('lab_categories', 'labs.category_id', 'lab_categories.id')
        .select('user_lab_progress.*', 'labs.title', 'labs.difficulty', 'labs.points as max_points', 'lab_categories.name as category_name')
        .where('user_lab_progress.user_id', user.id)
        .whereNull('user_lab_progress.deleted_at')
        .orderBy('labs.order_index');

      const submissions = await db('submissions')
        .join('labs', 'submissions.lab_id', 'labs.id')
        .select('submissions.*', 'labs.title')
        .where('submissions.user_id', user.id)
        .whereNull('submissions.deleted_at')
        .orderBy('submissions.submitted_at', 'desc')
        .limit(100);

      const commandHistory = await db('command_recordings')
        .where({ user_id: user.id })
        .orderBy('executed_at', 'desc')
        .limit(500);

      const badges = await db('user_badges')
        .join('badges', 'user_badges.badge_id', 'badges.id')
        .select('badges.*', 'user_badges.awarded_at')
        .where('user_badges.user_id', user.id);

      const gradeTrend = await db.raw(`
        SELECT DATE(created_at) as date, AVG(score_awarded) as avg_score, COUNT(*) as labs_count
        FROM user_lab_progress
        WHERE user_id = ? AND status = 'completed' AND deleted_at IS NULL
        GROUP BY DATE(created_at)
        ORDER BY date ASC
        LIMIT 30
      `, [user.id]);

      res.json({ user, progress, submissions, commandHistory, badges, gradeTrend: gradeTrend.rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch user details' });
    }
  });

  app.post('/api/admin/users', async (req, res) => {
    try {
      const { username, email, password, role, organization_id } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password required' });
      }

      const existing = await db('users').where(function() {
        this.where({ username }).orWhere({ email });
      }).whereNull('deleted_at').first();
      if (existing) return res.status(400).json({ error: 'Username or email already exists' });

      const hash = await bcrypt.hash(password, 12);
      const [row] = await db('users').insert({
        username,
        email,
        password_hash: hash,
        role: role || 'student',
        organization_id: organization_id || req.user.organization_id,
        is_active: true,
        must_change_password: true,
      }).returning('id');
      const id = row.id || row;

      await logAuditEvent({
        actorUserId: req.user.id,
        action: 'user_created',
        resourceType: 'user',
        resourceId: id,
        newValues: { username, email, role },
        ipAddress: req.ip,
      });

      res.json({ id, username, email, role });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  app.patch('/api/admin/users/:id', async (req, res) => {
    try {
      const { role, is_active, password, username, email } = req.body;
      const updates = {};
      if (role) updates.role = role;
      if (is_active !== undefined) updates.is_active = is_active;
      if (password) updates.password_hash = await bcrypt.hash(password, 12);
      if (username) updates.username = username;
      if (email) updates.email = email;
      updates.updated_at = db.fn.now();

      const oldUser = await db('users').where({ id: req.params.id }).first();

      await db('users').where({ id: req.params.id }).update(updates);

      await logAuditEvent({
        actorUserId: req.user.id,
        action: 'user_updated',
        resourceType: 'user',
        resourceId: req.params.id,
        oldValues: oldUser,
        newValues: updates,
        ipAddress: req.ip,
      });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  app.delete('/api/admin/users/:id', async (req, res) => {
    try {
      const oldUser = await db('users').where({ id: req.params.id }).first();

      await db('users').where({ id: req.params.id }).update({
        deleted_at: db.fn.now(),
        is_active: false,
        username: `deleted_${Date.now()}_${oldUser?.username}`,
        email: `deleted_${Date.now()}_${oldUser?.email}`,
      });

      await logAuditEvent({
        actorUserId: req.user.id,
        action: 'user_deleted',
        resourceType: 'user',
        resourceId: req.params.id,
        oldValues: oldUser,
        ipAddress: req.ip,
      });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  app.post('/api/admin/invitations', async (req, res) => {
    try {
      const { email, role, cohort_id } = req.body;
      if (!email) return res.status(400).json({ error: 'Email required' });

      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const [row] = await db('invitations').insert({
        organization_id: req.user.organization_id,
        email,
        role: role || 'student',
        token,
        expires_at: expiresAt,
      }).returning('id');
      const id = row.id || row;

      await logAuditEvent({
        actorUserId: req.user.id,
        action: 'invitation_created',
        resourceType: 'invitation',
        resourceId: id,
        newValues: { email, role },
        ipAddress: req.ip,
      });

      const signupUrl = `${process.env.FRONTEND_URL}/signup?token=${token}`;
      res.json({ id, email, token, signupUrl, expiresAt });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create invitation' });
    }
  });

  app.get('/api/admin/cohorts', async (req, res) => {
    try {
      const cohorts = await db('cohorts')
        .whereNull('deleted_at')
        .orderBy('created_at', 'desc');

      for (const cohort of cohorts) {
        const memberCount = await db('cohort_members')
          .where({ cohort_id: cohort.id })
          .whereNull('left_at')
          .count('* as total').first();
        cohort.member_count = parseInt(memberCount.total);
      }

      res.json(cohorts);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch cohorts' });
    }
  });

  app.post('/api/admin/cohorts', async (req, res) => {
    try {
      const { name, description, start_date, end_date } = req.body;
      const [row] = await db('cohorts').insert({
        organization_id: req.user.organization_id,
        name,
        description,
        start_date: start_date || null,
        end_date: end_date || null,
      }).returning('id');
      const id = row.id || row;

      await logAuditEvent({
        actorUserId: req.user.id,
        action: 'cohort_created',
        resourceType: 'cohort',
        resourceId: id,
        newValues: { name, description },
        ipAddress: req.ip,
      });

      res.json({ id, name });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create cohort' });
    }
  });

  app.post('/api/admin/cohorts/:cohortId/members', async (req, res) => {
    try {
      const { user_ids } = req.body;
      const inserts = user_ids.map(user_id => ({
        cohort_id: req.params.cohortId,
        user_id,
      }));

      if (inserts.length > 0) {
        await db('cohort_members').insert(inserts).onConflict(['cohort_id', 'user_id']).ignore();
      }

      res.json({ success: true, added: user_ids.length });
    } catch (err) {
      res.status(500).json({ error: 'Failed to add members' });
    }
  });

  app.get('/api/admin/cohorts/:cohortId/progress', async (req, res) => {
    try {
      const members = await db('cohort_members')
        .join('users', 'cohort_members.user_id', 'users.id')
        .where('cohort_members.cohort_id', req.params.cohortId)
        .whereNull('cohort_members.left_at')
        .whereNull('users.deleted_at')
        .select('users.id', 'users.username', 'users.email');

      const labs = await db('labs')
        .leftJoin('cohort_labs', 'labs.id', 'cohort_labs.lab_id')
        .where('cohort_labs.cohort_id', req.params.cohortId)
        .whereNull('labs.deleted_at')
        .select('labs.id', 'labs.title', 'labs.order_index')
        .orderBy('labs.order_index');

      const heatmap = [];
      for (const member of members) {
        const row = { user_id: member.id, username: member.username, email: member.email, labs: {} };
        for (const lab of labs) {
          const progress = await db('user_lab_progress')
            .where({ user_id: member.id, lab_id: lab.id })
            .whereNull('deleted_at')
            .first();
          row.labs[lab.id] = progress ? { status: progress.status, score: progress.score_awarded } : { status: 'not_started', score: 0 };
        }
        heatmap.push(row);
      }

      res.json({ heatmap, labs: labs.map(l => ({ id: l.id, title: l.title })) });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch cohort progress' });
    }
  });

  app.get('/api/admin/labs', async (req, res) => {
    try {
      const labs = await db('labs')
        .leftJoin('lab_categories', 'labs.category_id', 'lab_categories.id')
        .whereNull('labs.deleted_at')
        .select('labs.*', 'lab_categories.slug as category_slug', 'lab_categories.name as category_name')
        .orderBy('labs.order_index');

      for (const lab of labs) {
        const stats = await db.raw(`
          SELECT
            count(*) FILTER (WHERE status = 'completed') as completions,
            count(*) FILTER (WHERE status = 'in_progress') as in_progress,
            AVG(score_awarded) as avg_score,
            AVG(time_spent_seconds) as avg_time,
            AVG(hints_used) as avg_hints,
            AVG(attempt_count) as avg_attempts
          FROM user_lab_progress
          WHERE lab_id = ? AND deleted_at IS NULL
        `, [lab.id]);

        lab.stats = stats.rows[0];
      }

      res.json(labs);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch labs' });
    }
  });

  app.patch('/api/admin/labs/:id', async (req, res) => {
    try {
      const { title, description, difficulty, points, estimated_minutes, is_visible, visible_from, visible_until, hints, verification_steps, hint_penalty_percent, speed_bonus_threshold_minutes, speed_bonus_points } = req.body;
      const updates = {};

      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (difficulty !== undefined) updates.difficulty = difficulty;
      if (points !== undefined) updates.points = parseInt(points);
      if (estimated_minutes !== undefined) updates.estimated_minutes = parseInt(estimated_minutes);
      if (is_visible !== undefined) updates.is_visible = is_visible;
      if (visible_from !== undefined) updates.visible_from = visible_from;
      if (visible_until !== undefined) updates.visible_until = visible_until;
      if (hints !== undefined) updates.hints = JSON.stringify(hints);
      if (verification_steps !== undefined) updates.verification_steps = JSON.stringify(verification_steps);
      if (hint_penalty_percent !== undefined) updates.hint_penalty_percent = parseInt(hint_penalty_percent);
      if (speed_bonus_threshold_minutes !== undefined) updates.speed_bonus_threshold_minutes = parseInt(speed_bonus_threshold_minutes);
      if (speed_bonus_points !== undefined) updates.speed_bonus_points = parseInt(speed_bonus_points);
      updates.updated_at = db.fn.now();

      const oldLab = await db('labs').where({ id: req.params.id }).first();

      await db('labs').where({ id: req.params.id }).update(updates);

      await logAuditEvent({
        actorUserId: req.user.id,
        action: 'lab_updated',
        resourceType: 'lab',
        resourceId: req.params.id,
        oldValues: oldLab,
        newValues: updates,
        ipAddress: req.ip,
      });

      await cacheDel(`lab:${req.params.id}`);
      await cacheDelPattern('labs:*');

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update lab' });
    }
  });

  app.post('/api/admin/labs', async (req, res) => {
    try {
      const { lab_key, category_id, subcategory, title, description, difficulty, points, estimated_minutes, skills, scenario, symptoms, mission, hints, verification_command, verification_steps, solution, docker_compose_path, version, is_visible, order_index, prerequisite_lab_id } = req.body;

      const [row] = await db('labs').insert({
        lab_key,
        category_id,
        subcategory,
        title,
        description,
        difficulty: difficulty || 'beginner',
        points: points || 100,
        estimated_minutes: estimated_minutes || 30,
        skills: skills ? JSON.stringify(skills) : '[]',
        scenario,
        symptoms,
        mission,
        hints: hints ? JSON.stringify(hints) : '[]',
        verification_command,
        verification_steps: verification_steps ? JSON.stringify(verification_steps) : '[]',
        solution,
        docker_compose_path,
        version: version || 1,
        is_visible: is_visible !== undefined ? is_visible : true,
        order_index: order_index || 0,
        prerequisite_lab_id,
      }).returning('id');
      const id = row.id || row;

      await logAuditEvent({
        actorUserId: req.user.id,
        action: 'lab_created',
        resourceType: 'lab',
        resourceId: id,
        newValues: { lab_key, title },
        ipAddress: req.ip,
      });

      res.json({ id, lab_key });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create lab' });
    }
  });

  app.get('/api/admin/environments', async (req, res) => {
    try {
      const environments = await db('user_environments')
        .join('users', 'user_environments.user_id', 'users.id')
        .join('labs', 'user_environments.lab_id', 'labs.id')
        .whereNull('user_environments.deleted_at')
        .select(
          'user_environments.*',
          'users.username',
          'users.email',
          'labs.title as lab_title',
          'labs.lab_key'
        )
        .orderBy('user_environments.started_at', 'desc');

      res.json(environments);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch environments' });
    }
  });

  app.post('/api/admin/environments/:id/kill', async (req, res) => {
    try {
      const env = await db('user_environments').where({ id: req.params.id }).first();
      if (!env) return res.status(404).json({ error: 'Environment not found' });

      const dockerManager = require('../dockerManager');
      await dockerManager.forceStopEnvironment(env.user_id, env.lab_id);

      await db('user_environments').where({ id: req.params.id }).update({
        container_status: 'stopped',
        deleted_at: db.fn.now(),
      });

      await logAuditEvent({
        actorUserId: req.user.id,
        action: 'environment_killed',
        resourceType: 'environment',
        resourceId: req.params.id,
        ipAddress: req.ip,
      });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to kill environment' });
    }
  });

  app.get('/api/admin/audit-logs', async (req, res) => {
    try {
      const { page = 1, limit = 50, action, resource_type, actor_user_id, start_date, end_date } = req.query;
      const auditLogger = require('../audit/auditLogger');

      const result = await auditLogger.getAuditLogs({
        page: parseInt(page),
        limit: parseInt(limit),
        action,
        resourceType: resource_type,
        actorUserId: actor_user_id,
        startDate: start_date,
        endDate: end_date,
      });

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  });

  app.get('/api/admin/announcements', async (req, res) => {
    try {
      const announcements = await db('announcements')
        .whereNull('deleted_at')
        .where(function() {
          this.whereNull('expires_at').orWhere('expires_at', '>=', db.fn.now());
        })
        .orderBy('created_at', 'desc');
      res.json(announcements);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch announcements' });
    }
  });

  app.post('/api/admin/announcements', async (req, res) => {
    try {
      const { title, message, priority, cohort_id, expires_at } = req.body;
      const [row] = await db('announcements').insert({
        organization_id: req.user.organization_id,
        cohort_id: cohort_id || null,
        created_by_user_id: req.user.id,
        title,
        message,
        priority: priority || 'medium',
        expires_at: expires_at || null,
      }).returning('id');
      const id = row.id || row;

      await logAuditEvent({
        actorUserId: req.user.id,
        action: 'announcement_created',
        resourceType: 'announcement',
        resourceId: id,
        ipAddress: req.ip,
      });

      res.json({ id, title });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create announcement' });
    }
  });

  app.get('/api/admin/grades/export', async (req, res) => {
    try {
      const { cohort_id, format = 'csv' } = req.query;

      let usersQuery = db('users')
        .whereNull('users.deleted_at')
        .select('users.id', 'users.username', 'users.email');

      if (cohort_id) {
        usersQuery = usersQuery
          .join('cohort_members', 'users.id', 'cohort_members.user_id')
          .where('cohort_members.cohort_id', cohort_id)
          .whereNull('cohort_members.left_at');
      }

      const users = await usersQuery;

      const labs = await db('labs')
        .whereNull('deleted_at')
        .select('id', 'title', 'points')
        .orderBy('order_index');

      const rows = [];
      const header = ['Username', 'Email', ...labs.map(l => l.title), 'Total Score'];

      for (const user of users) {
        const row = [user.username, user.email];
        let totalScore = 0;

        for (const lab of labs) {
          const progress = await db('user_lab_progress')
            .where({ user_id: user.id, lab_id: lab.id })
            .whereNull('deleted_at')
            .first();
          const score = progress?.score_awarded || 0;
          totalScore += score;
          row.push(score);
        }

        row.push(totalScore);
        rows.push(row);
      }

      if (format === 'csv') {
        const csvContent = [header, ...rows].map(row => row.join(',')).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="grades.csv"');
        res.send(csvContent);
      } else {
        res.json({ header, rows });
      }
    } catch (err) {
      res.status(500).json({ error: 'Failed to export grades' });
    }
  });

  app.post('/api/admin/submissions/:id/grade', async (req, res) => {
    try {
      const { score, comment } = req.body;
      if (score === undefined) return res.status(400).json({ error: 'Score required' });

      await db('submissions').where({ id: req.params.id }).update({
        score: parseInt(score),
        instructor_comment: comment || null,
        graded_by_user_id: req.user.id,
        graded_at: db.fn.now(),
      });

      const submission = await db('submissions').where({ id: req.params.id }).first();
      if (submission) {
        await db('user_lab_progress')
          .where({ user_id: submission.user_id, lab_id: submission.lab_id })
          .update({ score_awarded: parseInt(score), updated_at: db.fn.now() });
      }

      await logAuditEvent({
        actorUserId: req.user.id,
        action: 'submission_graded',
        resourceType: 'submission',
        resourceId: req.params.id,
        newValues: { score, comment },
        ipAddress: req.ip,
      });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to grade submission' });
    }
  });
}

module.exports = { setupAdminRoutes };
