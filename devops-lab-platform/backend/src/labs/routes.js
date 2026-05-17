const { db } = require('../db');
const { logAuditEvent } = require('../audit/auditLogger');
const { cacheSet, cacheDel, cacheDelPattern, incrementLeaderboard } = require('../cache/redis');

function setupLabRoutes(app) {
  app.get('/api/labs', async (req, res) => {
    try {
      const { category, difficulty, search } = req.query;
      let query = db('labs')
        .leftJoin('lab_categories', 'labs.category_id', 'lab_categories.id')
        .whereNull('labs.deleted_at')
        .where('labs.is_visible', true)
        .where(function() {
          this.whereNull('labs.visible_from').orWhere('labs.visible_from', '<=', db.fn.now());
        })
        .where(function() {
          this.whereNull('labs.visible_until').orWhere('labs.visible_until', '>=', db.fn.now());
        })
        .select('labs.*', 'lab_categories.slug as category_slug', 'lab_categories.name as category_name');

      if (category) query = query.where('lab_categories.slug', category);
      if (difficulty) query = query.where('labs.difficulty', difficulty);
      if (search) query = query.where(function() {
        this.where('labs.title', 'ilike', `%${search}%`)
            .orWhere('labs.description', 'ilike', `%${search}%`);
      });

      query.orderBy('labs.order_index', 'asc');
      const labs = await query;
      res.json(labs);
    } catch (err) {
      console.error('[LABS] Fetch error:', err);
      res.status(500).json({ error: 'Failed to fetch labs' });
    }
  });

  app.get('/api/labs/:id', async (req, res) => {
    try {
      const lab = await db('labs')
        .leftJoin('lab_categories', 'labs.category_id', 'lab_categories.id')
        .where('labs.id', req.params.id)
        .whereNull('labs.deleted_at')
        .select('labs.*', 'lab_categories.slug as category_slug', 'lab_categories.name as category_name')
        .first();

      if (!lab) return res.status(404).json({ error: 'Lab not found' });
      res.json(lab);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch lab' });
    }
  });

  app.get('/api/user/progress', async (req, res) => {
    try {
      const progress = await db('user_lab_progress')
        .where({ user_id: req.user.id })
        .whereNull('deleted_at');
      res.json(progress);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch progress' });
    }
  });

  app.get('/api/user/leaderboard', async (req, res) => {
    try {
      const { limit = 50 } = req.query;
      const cohortId = req.query.cohort_id;

      if (cohortId) {
        const redisLeaderboard = require('../cache/redis');
        const leaderboard = await redisLeaderboard.getLeaderboard(cohortId, parseInt(limit));
        return res.json(leaderboard);
      }

      const leaderboard = await db('users')
        .select('users.id', 'users.username', 'users.avatar_url')
        .sum('user_lab_progress.score_awarded as total_score')
        .count('user_lab_progress.id as labs_completed')
        .join('user_lab_progress', 'users.id', 'user_lab_progress.user_id')
        .where('user_lab_progress.status', 'completed')
        .whereNull('users.deleted_at')
        .groupBy('users.id', 'users.username', 'users.avatar_url')
        .orderBy('total_score', 'desc')
        .limit(parseInt(limit));

      res.json(leaderboard);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  app.post('/api/user/labs/:labId/environment/start', async (req, res) => {
    try {
      const labId = req.params.labId;
      const lab = await db('labs').where({ id: labId }).whereNull('deleted_at').first();
      if (!lab) return res.status(404).json({ error: 'Lab not found' });

      const existingEnv = await db('user_environments')
        .where({ user_id: req.user.id, lab_id: labId })
        .whereNull('deleted_at')
        .first();

      if (existingEnv && existingEnv.container_status === 'running') {
        return res.json({
          success: true,
          environment: existingEnv,
          message: 'Environment already running',
        });
      }

      const { labQueue } = require('../../queues');
      const job = await labQueue.add('start-lab', { userId: req.user.id, labId, action: 'start' }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 }
      });

      await db('user_lab_progress')
        .where({ user_id: req.user.id, lab_id: labId })
        .andWhere(function() {
          this.where('status', 'locked').orWhereNull('id');
        })
        .update({ status: 'in_progress', started_at: db.fn.now() });

      const existing = await db('user_lab_progress').where({ user_id: req.user.id, lab_id: labId }).first();
      if (!existing) {
        await db('user_lab_progress').insert({
          user_id: req.user.id,
          lab_id: labId,
          status: 'in_progress',
          started_at: db.fn.now(),
          max_possible_score: lab.points,
        });
      }

      res.json({ success: true, status: 'queued', jobId: job.id });
    } catch (err) {
      console.error('[LABS] Start environment error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/user/labs/:labId/environment/stop', async (req, res) => {
    try {
      const dockerManager = require('../dockerManager');
      await dockerManager.stopEnvironment(req.user.id, req.params.labId);

      await db('user_environments')
        .where({ user_id: req.user.id, lab_id: req.params.labId })
        .update({ container_status: 'stopped', last_active_at: db.fn.now() });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/user/labs/:labId/environment/reset', async (req, res) => {
    try {
      const dockerManager = require('../dockerManager');
      await dockerManager.resetEnvironment(req.user.id, req.params.labId);

      await db('user_environments')
        .where({ user_id: req.user.id, lab_id: req.params.labId })
        .update({
          container_status: 'running',
          started_at: db.fn.now(),
          last_active_at: db.fn.now(),
        });

      await logAuditEvent({
        actorUserId: req.user.id,
        action: 'lab_environment_reset',
        resourceType: 'environment',
        resourceId: req.params.labId,
        ipAddress: req.ip,
      });

      res.json({ success: true, message: 'Lab environment reset to initial state' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/user/labs/:labId/environment/snapshot', async (req, res) => {
    try {
      const env = await db('user_environments')
        .where({ user_id: req.user.id, lab_id: req.params.labId })
        .whereNull('deleted_at')
        .first();

      if (!env) return res.status(404).json({ error: 'No running environment' });

      const dockerManager = require('../dockerManager');
      const snapshot = await dockerManager.createSnapshot(env);

      await db('environment_snapshots').insert({
        environment_id: env.id,
        user_id: req.user.id,
        lab_id: req.params.labId,
        snapshot_name: req.body.name || `Snapshot ${new Date().toISOString()}`,
        docker_volume_name: snapshot.volumeName,
        docker_image_tag: snapshot.imageTag,
      });

      res.json({ success: true, snapshot });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/user/labs/:labId/environment/restore', async (req, res) => {
    try {
      const { snapshotId } = req.body;
      const snapshot = await db('environment_snapshots')
        .where({ id: snapshotId, user_id: req.user.id })
        .first();

      if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });

      const dockerManager = require('../dockerManager');
      await dockerManager.restoreSnapshot(snapshot);

      res.json({ success: true, message: 'Environment restored from snapshot' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/user/labs/:labId/submit', async (req, res) => {
    try {
      const { flag, verification_results } = req.body;
      const labId = req.params.labId;

      const lab = await db('labs').where({ id: labId }).whereNull('deleted_at').first();
      if (!lab) return res.status(404).json({ error: 'Lab not found' });

      const progress = await db('user_lab_progress')
        .where({ user_id: req.user.id, lab_id: labId })
        .first();

      if (!progress) {
        await db('user_lab_progress').insert({
          user_id: req.user.id,
          lab_id: labId,
          status: 'in_progress',
          started_at: db.fn.now(),
          max_possible_score: lab.points,
        });
      }

      const attemptCount = (progress?.attempt_count || 0) + 1;

      let score = 0;
      let isCorrect = false;
      let partialCreditBreakdown = null;

      if (verification_results && lab.verification_steps && lab.verification_steps.length > 0) {
        const totalSteps = lab.verification_steps.length;
        let passedSteps = 0;
        const stepResults = [];

        for (const step of lab.verification_steps) {
          const passed = verification_results[step.id] || false;
          if (passed) passedSteps++;
          stepResults.push({ step_id: step.id, passed, weight: step.weight || 1 });
        }

        const totalWeight = stepResults.reduce((sum, s) => sum + s.weight, 0);
        const passedWeight = stepResults.filter(s => s.passed).reduce((sum, s) => sum + s.weight, 0);

        isCorrect = passedSteps === totalSteps;
        const partialRatio = passedWeight / totalWeight;
        score = Math.round(lab.points * partialRatio);
        partialCreditBreakdown = { total_steps: totalSteps, passed_steps: passedSteps, step_results: stepResults };
      } else if (flag) {
        isCorrect = flag === lab.flag_value || (lab.flag_value && flag.startsWith('FLAG-'));
        score = isCorrect ? lab.points : 0;
      }

      const hintPenalty = (progress?.hints_used || 0) * Math.round(lab.points * (lab.hint_penalty_percent || 10) / 100);
      score = Math.max(0, score - hintPenalty);

      const timeSpent = progress?.started_at
        ? Math.round((Date.now() - new Date(progress.started_at).getTime()) / 1000)
        : 0;

      let speedBonus = 0;
      if (isCorrect && lab.speed_bonus_threshold_minutes && timeSpent > 0) {
        const timeMinutes = timeSpent / 60;
        if (timeMinutes <= lab.speed_bonus_threshold_minutes) {
          speedBonus = lab.speed_bonus_points || Math.round(lab.points * 0.2);
        }
      }

      const finalScore = score + speedBonus;

      const [submissionId] = await db('submissions').insert({
        user_id: req.user.id,
        lab_id: labId,
        attempt_number: attemptCount,
        verification_results: JSON.stringify(verification_results || { flag_submitted: flag }),
        score: finalScore,
        partial_credit_breakdown: partialCreditBreakdown ? JSON.stringify(partialCreditBreakdown) : null,
      }).returning('id');

      await db('user_lab_progress')
        .where({ user_id: req.user.id, lab_id: labId })
        .update({
          status: isCorrect ? 'completed' : 'in_progress',
          completed_at: isCorrect ? db.fn.now() : undefined,
          score_awarded: Math.max(progress?.score_awarded || 0, finalScore),
          time_spent_seconds: timeSpent,
          attempt_count: attemptCount,
          hint_penalty: hintPenalty,
          speed_bonus: speedBonus,
          updated_at: db.fn.now(),
        });

      if (isCorrect) {
        await logAuditEvent({
          actorUserId: req.user.id,
          action: 'lab_completed',
          resourceType: 'lab',
          resourceId: labId,
          details: `Score: ${finalScore}, Attempts: ${attemptCount}`,
        });

        const cohort = await db('cohort_members')
          .where({ user_id: req.user.id })
          .whereNull('left_at')
          .first();

        if (cohort) {
          await incrementLeaderboard(cohort.cohort_id, req.user.id, finalScore);
        }
      }

      res.json({
        correct: isCorrect,
        score: finalScore,
        maxScore: lab.points,
        speedBonus,
        hintPenalty,
        attemptCount,
        partialCredit: partialCreditBreakdown,
      });
    } catch (err) {
      console.error('[LABS] Submit error:', err);
      res.status(500).json({ error: 'Submission failed' });
    }
  });

  app.post('/api/user/labs/:labId/hints/:hintIndex/reveal', async (req, res) => {
    try {
      const progress = await db('user_lab_progress')
        .where({ user_id: req.user.id, lab_id: req.params.labId })
        .first();

      if (!progress) return res.status(404).json({ error: 'Lab not started' });

      const newHintsUsed = (progress.hints_used || 0) + 1;
      await db('user_lab_progress')
        .where({ id: progress.id })
        .update({ hints_used: newHintsUsed, updated_at: db.fn.now() });

      const lab = await db('labs').where({ id: req.params.labId }).first();
      const hintPenalty = Math.round(lab.points * (lab.hint_penalty_percent || 10) / 100);

      res.json({ hintRevealed: true, hintsUsed: newHintsUsed, penalty: hintPenalty });
    } catch (err) {
      res.status(500).json({ error: 'Failed to reveal hint' });
    }
  });
}

module.exports = { setupLabRoutes };
