const { Worker } = require('bullmq');
const { connection } = require('./queues');
const dockerManager = require('./dockerManager');
const { publishEvent } = require('./cache/redis');

const labWorker = new Worker('lab-queue', async job => {
  const { userId, labId, action } = job.data;
  
  if (action === 'start') {
    await publishEvent('lab:events', { type: 'environment_queued', userId, labId, status: 'starting' });
    try {
      const result = await dockerManager.startEnvironment(userId, labId);
      await publishEvent('lab:events', { type: 'environment_ready', userId, labId, status: 'ready', ...result });
      return result;
    } catch (err) {
      await publishEvent('lab:events', { type: 'environment_error', userId, labId, status: 'error', error: err.message });
      throw err;
    }
  }
  
  if (action === 'stop') {
    await dockerManager.stopEnvironment(userId, labId);
    return { stopped: true };
  }
}, { connection });

labWorker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

module.exports = { labWorker };
