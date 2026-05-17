const knex = require('knex');
const fs = require('fs');
const path = require('path');

const knexConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'devops_super_secret',
    database: process.env.DB_NAME || 'devops_labs',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2'),
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  },
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    tableName: 'knex_migrations',
  },
  debug: process.env.DB_DEBUG === 'true',
};

const db = knex(knexConfig);

async function runMigrations() {
  console.log('[DB] Running migrations...');
  try {
    const pending = await db.migrate.list();
    if (pending[1].length === 0) {
      console.log('[DB] No pending migrations');
      return;
    }
    await db.migrate.latest();
    console.log('[DB] Migrations complete');
  } catch (err) {
    console.error('[DB] Migration failed:', err.message);
    throw err;
  }
}

async function rollbackMigration(steps = 1) {
  console.log(`[DB] Rolling back ${steps} migration(s)...`);
  await db.migrate.rollback({ step: steps });
  console.log('[DB] Rollback complete');
}

async function seedDatabase() {
  console.log('[DB] Seeding database...');
  const seedDir = path.join(__dirname, 'seeds');
  const seedFiles = fs.readdirSync(seedDir).filter(f => f.endsWith('.js')).sort();

  for (const file of seedFiles) {
    const seed = require(path.join(seedDir, file));
    if (typeof seed.run === 'function') {
      console.log(`[DB] Running seed: ${file}`);
      await seed.run(db);
    }
  }
  console.log('[DB] Seeding complete');
}

async function getConnectionStats() {
  const result = await db.raw(`
    SELECT count(*) as total,
           sum(case when state = 'active' then 1 else 0 end) as active,
           sum(case when state = 'idle' then 1 else 0 end) as idle,
           sum(case when state = 'idle in transaction' then 1 else 0 end) as idle_in_transaction
    FROM pg_stat_activity
    WHERE datname = current_database()
  `);
  return result.rows[0];
}

module.exports = {
  db,
  knexConfig,
  runMigrations,
  rollbackMigration,
  seedDatabase,
  getConnectionStats,
};
