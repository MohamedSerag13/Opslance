const { Queue, Worker, QueueEvents } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || 'redis_secret',
  maxRetriesPerRequest: null
});

const labQueue = new Queue('lab-queue', { connection });
const labQueueEvents = new QueueEvents('lab-queue', { connection });

module.exports = {
  connection,
  labQueue,
  labQueueEvents,
  Worker
};
