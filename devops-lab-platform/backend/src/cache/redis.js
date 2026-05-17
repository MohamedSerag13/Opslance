const Redis = require('ioredis');

let redisClient = null;

function getRedisClient() {
  if (redisClient) return redisClient;

  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || null,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true,
  });

  redisClient.on('error', (err) => console.error('[Redis] Error:', err.message));
  redisClient.on('connect', () => console.log('[Redis] Connected'));
  redisClient.on('ready', () => console.log('[Redis] Ready'));

  return redisClient;
}

async function cacheGet(key) {
  try {
    const client = getRedisClient();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('[Redis] cacheGet error:', err.message);
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds = 3600) {
  try {
    const client = getRedisClient();
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    console.error('[Redis] cacheSet error:', err.message);
  }
}

async function cacheDel(key) {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (err) {
    console.error('[Redis] cacheDel error:', err.message);
  }
}

async function cacheDelPattern(pattern) {
  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) await client.del(...keys);
  } catch (err) {
    console.error('[Redis] cacheDelPattern error:', err.message);
  }
}

async function incrementLeaderboard(cohortId, userId, points) {
  try {
    const client = getRedisClient();
    await client.zincrby(`leaderboard:${cohortId}`, points, userId);
  } catch (err) {
    console.error('[Redis] incrementLeaderboard error:', err.message);
  }
}

async function getLeaderboard(cohortId, limit = 50) {
  try {
    const client = getRedisClient();
    const results = await client.zrevrange(`leaderboard:${cohortId}`, 0, limit - 1, 'WITHSCORES');
    const leaderboard = [];
    for (let i = 0; i < results.length; i += 2) {
      leaderboard.push({ user_id: results[i], score: parseInt(results[i + 1]) });
    }
    return leaderboard;
  } catch (err) {
    console.error('[Redis] getLeaderboard error:', err.message);
    return [];
  }
}

async function publishEvent(channel, data) {
  try {
    const client = getRedisClient();
    await client.publish(channel, JSON.stringify(data));
  } catch (err) {
    console.error('[Redis] publishEvent error:', err.message);
  }
}

async function subscribeToEvent(channel, handler) {
  try {
    const client = getRedisClient();
    const subscriber = client.duplicate();
    await subscriber.subscribe(channel);
    subscriber.on('message', (ch, message) => {
      try {
        handler(ch, JSON.parse(message));
      } catch (err) {
        console.error('[Redis] subscribe handler error:', err.message);
      }
    });
    return subscriber;
  } catch (err) {
    console.error('[Redis] subscribeToEvent error:', err.message);
  }
}

async function storeSession(sessionId, data, ttlSeconds = 86400) {
  try {
    const client = getRedisClient();
    await client.set(`session:${sessionId}`, JSON.stringify(data), 'EX', ttlSeconds);
  } catch (err) {
    console.error('[Redis] storeSession error:', err.message);
  }
}

async function getSession(sessionId) {
  try {
    const client = getRedisClient();
    const data = await client.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('[Redis] getSession error:', err.message);
    return null;
  }
}

async function deleteSession(sessionId) {
  try {
    const client = getRedisClient();
    await client.del(`session:${sessionId}`);
  } catch (err) {
    console.error('[Redis] deleteSession error:', err.message);
  }
}

module.exports = {
  getRedisClient,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
  incrementLeaderboard,
  getLeaderboard,
  publishEvent,
  subscribeToEvent,
  storeSession,
  getSession,
  deleteSession,
};
