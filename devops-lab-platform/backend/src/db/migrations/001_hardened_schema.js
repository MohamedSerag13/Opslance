exports.up = async function(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await knex.schema.createTable('organizations', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('slug').notNullable().unique();
    t.string('logo_url').nullable();
    t.string('primary_color').defaultTo('#3B82F6');
    t.string('custom_domain').nullable();
    t.boolean('is_active').defaultTo(true);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.timestamp('deleted_at').nullable();
    t.index('slug');
    t.index('is_active');
  });

  await knex.schema.createTable('users', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('organization_id').references('organizations.id').onDelete('CASCADE');
    t.string('username').notNullable();
    t.string('email').notNullable();
    t.string('password_hash').notNullable();
    t.enum('role', ['student', 'instructor', 'admin', 'super_admin']).defaultTo('student');
    t.boolean('is_active').defaultTo(true);
    t.string('avatar_url').nullable();
    t.integer('streak_count').defaultTo(0);
    t.timestamp('last_active_at').nullable();
    t.timestamp('email_verified_at').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.timestamp('deleted_at').nullable();
    t.unique(['username', 'organization_id']);
    t.unique(['email', 'organization_id']);
    t.index('organization_id');
    t.index('role');
    t.index('is_active');
    t.index('deleted_at');
  });

  await knex.schema.createTable('refresh_tokens', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').references('users.id').onDelete('CASCADE').notNullable();
    t.string('token_hash').notNullable();
    t.string('user_agent').nullable();
    t.string('ip_address').nullable();
    t.timestamp('expires_at').notNullable();
    t.timestamp('revoked_at').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index('user_id');
    t.index('token_hash');
    t.index('expires_at');
  });

  await knex.schema.createTable('invitations', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('organization_id').references('organizations.id').onDelete('CASCADE').notNullable();
    t.string('email').notNullable();
    t.enum('role', ['student', 'instructor', 'admin']).defaultTo('student');
    t.string('token').notNullable().unique();
    t.timestamp('expires_at').notNullable();
    t.timestamp('accepted_at').nullable();
    t.uuid('accepted_by_user_id').references('users.id').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('deleted_at').nullable();
    t.index('organization_id');
    t.index('token');
    t.index('email');
    t.index('expires_at');
  });

  await knex.schema.createTable('cohorts', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('organization_id').references('organizations.id').onDelete('CASCADE').notNullable();
    t.string('name').notNullable();
    t.string('description').nullable();
    t.timestamp('start_date').nullable();
    t.timestamp('end_date').nullable();
    t.boolean('is_active').defaultTo(true);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.timestamp('deleted_at').nullable();
    t.index('organization_id');
    t.index('is_active');
  });

  await knex.schema.createTable('cohort_members', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('cohort_id').references('cohorts.id').onDelete('CASCADE').notNullable();
    t.uuid('user_id').references('users.id').onDelete('CASCADE').notNullable();
    t.timestamp('joined_at').defaultTo(knex.fn.now());
    t.timestamp('left_at').nullable();
    t.unique(['cohort_id', 'user_id']);
    t.index('cohort_id');
    t.index('user_id');
  });

  await knex.schema.createTable('lab_categories', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('slug').notNullable().unique();
    t.string('name').notNullable();
    t.text('description').nullable();
    t.string('icon').nullable();
    t.integer('order_index').defaultTo(0);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.timestamp('deleted_at').nullable();
    t.index('slug');
    t.index('order_index');
  });

  await knex.schema.createTable('labs', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('lab_key').notNullable().unique();
    t.uuid('category_id').references('lab_categories.id').onDelete('SET NULL');
    t.string('subcategory').notNullable();
    t.string('title').notNullable();
    t.text('description').nullable();
    t.enum('difficulty', ['beginner', 'intermediate', 'advanced', 'expert']).defaultTo('beginner');
    t.integer('points').defaultTo(100);
    t.integer('estimated_minutes').defaultTo(30);
    t.json('skills').defaultTo('[]');
    t.text('scenario').nullable();
    t.text('symptoms').nullable();
    t.text('mission').nullable();
    t.json('hints').defaultTo('[]');
    t.integer('hint_penalty_percent').defaultTo(10);
    t.string('verification_command').nullable();
    t.json('verification_steps').defaultTo('[]');
    t.json('useful_commands').defaultTo('[]');
    t.text('solution').nullable();
    t.string('docker_compose_path').nullable();
    t.string('dockerfile_path').nullable();
    t.integer('version').defaultTo(1);
    t.boolean('is_visible').defaultTo(true);
    t.timestamp('visible_from').nullable();
    t.timestamp('visible_until').nullable();
    t.integer('order_index').defaultTo(0);
    t.uuid('prerequisite_lab_id').references('labs.id').onDelete('SET NULL');
    t.integer('speed_bonus_threshold_minutes').nullable();
    t.integer('speed_bonus_points').defaultTo(0);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.timestamp('deleted_at').nullable();
    t.index('category_id');
    t.index('difficulty');
    t.index('is_visible');
    t.index('visible_from');
    t.index('order_index');
    t.index('deleted_at');
  });

  await knex.schema.createTable('lab_versions', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('lab_id').references('labs.id').onDelete('CASCADE').notNullable();
    t.integer('version').notNullable();
    t.text('docker_compose_content').nullable();
    t.text('dockerfile_content').nullable();
    t.text('changelog').nullable();
    t.uuid('created_by_user_id').references('users.id').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.unique(['lab_id', 'version']);
    t.index('lab_id');
  });

  await knex.schema.createTable('cohort_labs', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('cohort_id').references('cohorts.id').onDelete('CASCADE').notNullable();
    t.uuid('lab_id').references('labs.id').onDelete('CASCADE').notNullable();
    t.timestamp('unlock_at').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.unique(['cohort_id', 'lab_id']);
    t.index('cohort_id');
    t.index('lab_id');
  });

  await knex.schema.createTable('user_lab_progress', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').references('users.id').onDelete('CASCADE').notNullable();
    t.uuid('lab_id').references('labs.id').onDelete('CASCADE').notNullable();
    t.enum('status', ['locked', 'unlocked', 'in_progress', 'completed', 'failed']).defaultTo('locked');
    t.timestamp('started_at').nullable();
    t.timestamp('completed_at').nullable();
    t.integer('score_awarded').defaultTo(0);
    t.integer('max_possible_score').defaultTo(0);
    t.integer('time_spent_seconds').defaultTo(0);
    t.integer('hints_used').defaultTo(0);
    t.integer('hint_penalty').defaultTo(0);
    t.integer('speed_bonus').defaultTo(0);
    t.integer('attempt_count').defaultTo(0);
    t.integer('lab_version').defaultTo(1);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.timestamp('deleted_at').nullable();
    t.unique(['user_id', 'lab_id']);
    t.index('user_id');
    t.index('lab_id');
    t.index('status');
  });

  await knex.schema.createTable('submissions', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').references('users.id').onDelete('CASCADE').notNullable();
    t.uuid('lab_id').references('labs.id').onDelete('CASCADE').notNullable();
    t.integer('attempt_number').defaultTo(1);
    t.json('verification_results').nullable();
    t.integer('score').defaultTo(0);
    t.integer('partial_credit_breakdown').nullable();
    t.text('instructor_comment').nullable();
    t.uuid('graded_by_user_id').references('users.id').onDelete('SET NULL');
    t.timestamp('graded_at').nullable();
    t.timestamp('submitted_at').defaultTo(knex.fn.now());
    t.timestamp('deleted_at').nullable();
    t.index('user_id');
    t.index('lab_id');
    t.index('submitted_at');
  });

  await knex.schema.createTable('command_recordings', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').references('users.id').onDelete('CASCADE').notNullable();
    t.uuid('lab_id').references('labs.id').onDelete('CASCADE').notNullable();
    t.uuid('submission_id').references('submissions.id').onDelete('SET NULL').nullable();
    t.text('command').notNullable();
    t.text('output').nullable();
    t.integer('exit_code').nullable();
    t.timestamp('executed_at').defaultTo(knex.fn.now());
    t.index('user_id');
    t.index('lab_id');
    t.index('submission_id');
    t.index('executed_at');
  });

  await knex.schema.createTable('user_environments', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').references('users.id').onDelete('CASCADE').notNullable();
    t.uuid('lab_id').references('labs.id').onDelete('CASCADE').notNullable();
    t.string('compose_project_name').notNullable();
    t.string('docker_network_name').nullable();
    t.enum('container_status', ['stopped', 'starting', 'running', 'error', 'paused', 'expired']).defaultTo('stopped');
    t.integer('assigned_port').nullable();
    t.integer('cpu_limit').defaultTo(500);
    t.integer('memory_limit_mb').defaultTo(512);
    t.timestamp('started_at').nullable();
    t.timestamp('expires_at').nullable();
    t.timestamp('last_active_at').defaultTo(knex.fn.now());
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('deleted_at').nullable();
    t.unique(['user_id', 'lab_id']);
    t.index('user_id');
    t.index('lab_id');
    t.index('container_status');
    t.index('expires_at');
  });

  await knex.schema.createTable('environment_snapshots', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('environment_id').references('user_environments.id').onDelete('CASCADE').notNullable();
    t.uuid('user_id').references('users.id').onDelete('CASCADE').notNullable();
    t.uuid('lab_id').references('labs.id').onDelete('CASCADE').notNullable();
    t.string('snapshot_name').nullable();
    t.string('docker_volume_name').nullable();
    t.string('docker_image_tag').nullable();
    t.bigint('size_bytes').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index('environment_id');
    t.index('user_id');
  });

  await knex.schema.createTable('audit_logs', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('actor_user_id').references('users.id').onDelete('SET NULL').nullable();
    t.string('actor_email').nullable();
    t.string('action').notNullable();
    t.string('resource_type').nullable();
    t.uuid('resource_id').nullable();
    t.json('old_values').nullable();
    t.json('new_values').nullable();
    t.string('ip_address').nullable();
    t.string('user_agent').nullable();
    t.text('details').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index('actor_user_id');
    t.index('action');
    t.index('resource_type');
    t.index('resource_id');
    t.index('created_at');
  });

  await knex.schema.createTable('announcements', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('organization_id').references('organizations.id').onDelete('CASCADE').notNullable();
    t.uuid('cohort_id').references('cohorts.id').onDelete('CASCADE').nullable();
    t.uuid('created_by_user_id').references('users.id').onDelete('SET NULL');
    t.string('title').notNullable();
    t.text('message').notNullable();
    t.enum('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
    t.boolean('is_active').defaultTo(true);
    t.timestamp('expires_at').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('deleted_at').nullable();
    t.index('organization_id');
    t.index('cohort_id');
    t.index('is_active');
    t.index('expires_at');
  });

  await knex.schema.createTable('badges', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('slug').notNullable().unique();
    t.string('name').notNullable();
    t.text('description').nullable();
    t.string('icon_url').nullable();
    t.enum('type', ['milestone', 'streak', 'perfect', 'speed', 'category', 'special']).defaultTo('milestone');
    t.json('criteria').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index('slug');
    t.index('type');
  });

  await knex.schema.createTable('user_badges', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').references('users.id').onDelete('CASCADE').notNullable();
    t.uuid('badge_id').references('badges.id').onDelete('CASCADE').notNullable();
    t.timestamp('awarded_at').defaultTo(knex.fn.now());
    t.unique(['user_id', 'badge_id']);
    t.index('user_id');
    t.index('badge_id');
  });

  await knex.schema.createTable('usage_metrics', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('organization_id').references('organizations.id').onDelete('CASCADE').notNullable();
    t.string('metric_type').notNullable();
    t.decimal('value', 15, 2).notNullable();
    t.string('unit').defaultTo('count');
    t.timestamp('recorded_at').defaultTo(knex.fn.now());
    t.index('organization_id');
    t.index('metric_type');
    t.index('recorded_at');
  });

  await knex.schema.createTable('sso_providers', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('organization_id').references('organizations.id').onDelete('CASCADE').notNullable();
    t.enum('provider_type', ['google', 'github', 'saml', 'oidc']).notNullable();
    t.string('name').notNullable();
    t.string('client_id').nullable();
    t.text('client_secret_encrypted').nullable();
    t.text('metadata_url').nullable();
    t.text('saml_metadata').nullable();
    t.boolean('is_active').defaultTo(true);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.index('organization_id');
    t.index('provider_type');
  });

  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  const tablesWithUpdatedAt = [
    'organizations', 'users', 'cohorts', 'lab_categories', 'labs',
    'user_lab_progress', 'sso_providers'
  ];
  for (const table of tablesWithUpdatedAt) {
    await knex.raw(`
      CREATE TRIGGER update_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  await knex.raw(`
    CREATE OR REPLACE FUNCTION prevent_audit_log_deletion()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'Audit logs cannot be deleted';
    END;
    $$ language 'plpgsql';
  `);
  await knex.raw(`
    CREATE TRIGGER prevent_audit_log_deletion
      BEFORE DELETE ON audit_logs
      FOR EACH STATEMENT
      EXECUTE FUNCTION prevent_audit_log_deletion();
  `);

  await knex.raw(`
    CREATE INDEX idx_submissions_user_lab ON submissions(user_id, lab_id, submitted_at DESC);
    CREATE INDEX idx_command_recordings_user_lab ON command_recordings(user_id, lab_id, executed_at DESC);
    CREATE INDEX idx_user_lab_progress_user_status ON user_lab_progress(user_id, status);
    CREATE INDEX idx_cohort_members_cohort ON cohort_members(cohort_id) WHERE left_at IS NULL;
  `);
};

exports.down = async function(knex) {
  const tables = [
    'usage_metrics', 'user_badges', 'badges', 'announcements',
    'environment_snapshots', 'user_environments', 'command_recordings',
    'submissions', 'user_lab_progress', 'cohort_labs', 'lab_versions',
    'labs', 'lab_categories', 'cohort_members', 'cohorts',
    'invitations', 'refresh_tokens', 'users', 'organizations', 'sso_providers'
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
  await knex.raw('DROP TRIGGER IF EXISTS prevent_audit_log_deletion ON audit_logs');
  await knex.raw('DROP FUNCTION IF EXISTS prevent_audit_log_deletion()');
  await knex.raw('DROP FUNCTION IF EXISTS update_updated_at_column()');
};
