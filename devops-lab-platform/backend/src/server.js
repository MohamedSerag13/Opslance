const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const { db, runMigrations, seedDatabase } = require('./db');
const { setupAuthRoutes } = require('./auth/routes');
const { setupLabRoutes } = require('./labs/routes');
const { setupAdminRoutes } = require('./admin/routes');
const { authMiddleware, requireRole } = require('./middleware/auth');
const { logAuditEvent } = require('./audit/auditLogger');
const { getRedisClient, cleanupExpiredTokens } = require('./cache/redis');
const { labQueue, Worker } = require('./queues');
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'backend' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: '/tmp/platform.log' }),
  ],
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }
});
app.set('io', io);

// Setup Pub/Sub for WebSockets
const redisSubscriber = getRedisClient().duplicate();
redisSubscriber.subscribe('lab:events');
redisSubscriber.on('message', (channel, message) => {
  if (channel === 'lab:events') {
    try { io.emit('lab_event', JSON.parse(message)); } catch {}
  }
});

// Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({
  queues: [new BullMQAdapter(labQueue)],
  serverAdapter: serverAdapter,
});
app.use('/admin/queues', authMiddleware, requireRole('admin', 'super_admin'), serverAdapter.getRouter());

app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts' },
});
app.use('/api/auth/login', authLimiter);

app.use((req, res, next) => {
  req.requestId = require('crypto').randomUUID();
  req.startTime = Date.now();
  logger.info({
    method: req.method,
    path: req.path,
    requestId: req.requestId,
    ip: req.ip,
  });
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.requestId,
    });
  });
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health/db', async (req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.get('/api/health/redis', async (req, res) => {
  try {
    const redis = getRedisClient();
    await redis.ping();
    res.json({ status: 'ok', redis: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', redis: 'disconnected' });
  }
});

setupAuthRoutes(app);

app.use('/api/user', authMiddleware);
app.use('/api/user/labs/:labId/hints', authMiddleware);
setupLabRoutes(app);

app.use('/api/admin', authMiddleware, requireRole('admin', 'super_admin', 'instructor'));
setupAdminRoutes(app);

app.use((err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId: req.requestId,
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal server error' });
});

async function startCleanupJobs() {
  setInterval(async () => {
    try {
      const expired = await db('user_environments')
        .where('expires_at', '<', db.fn.now())
        .where({ container_status: 'running' })
        .whereNull('deleted_at');

      for (const env of expired) {
        try {
          const dockerManager = require('./dockerManager');
          await dockerManager.forceStopEnvironment(env.user_id, env.lab_id);
          await db('user_environments')
            .where({ id: env.id })
            .update({ container_status: 'expired', deleted_at: db.fn.now() });

          await logAuditEvent({
            actorEmail: 'system',
            action: 'environment_expired',
            resourceType: 'environment',
            resourceId: env.id,
            details: `Auto-expired after inactivity`,
          });
        } catch (err) {
          logger.error({ message: 'Failed to cleanup expired env', envId: env.id, error: err.message });
        }
      }
    } catch (err) {
      logger.error({ message: 'Cleanup job error', error: err.message });
    }
  }, 5 * 60 * 1000);

  setInterval(async () => {
    try {
      await cleanupExpiredTokens();
    } catch (err) {
      logger.error({ message: 'Token cleanup error', error: err.message });
    }
  }, 60 * 60 * 1000);
}

const PORT = process.env.PORT || 4000;

server.listen(PORT, async () => {
  logger.info({ message: `Backend listening on port ${PORT}` });

  try {
    await runMigrations();
    await seedDatabase();
  } catch (err) {
    logger.error({ message: 'Migration/seed failed', error: err.message });
  }

  try {
    getRedisClient();
  } catch (err) {
    logger.warn({ message: 'Redis not available', error: err.message });
  }

  startCleanupJobs();
  logger.info({ message: 'Platform ready' });
});

require('./worker');

module.exports = server;
