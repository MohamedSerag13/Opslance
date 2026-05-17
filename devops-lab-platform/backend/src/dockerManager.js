const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const { db } = require('./db');
const { logAuditEvent } = require('./audit/auditLogger');
const { publishEvent } = require('./cache/redis');

const execPromise = util.promisify(exec);
const { spawn } = require('child_process');

class DockerManager {
  constructor() {
    this.basePort = parseInt(process.env.LAB_PORT_BASE || '20000');
    this.portRange = parseInt(process.env.LAB_PORT_RANGE || '1000');
    this.activeTimers = new Map();
    this.activeTerminals = new Map();
    this.hostLabsDir = process.env.HOST_LABS_DIR || '/app/labs';
    this.cpuLimit = parseInt(process.env.LAB_CPU_LIMIT || '500');
    this.memoryLimitMb = parseInt(process.env.LAB_MEMORY_LIMIT_MB || '512');
    this.expiryMinutes = parseInt(process.env.LAB_EXPIRY_MINUTES || '120');
    this.commonImages = [
      'ubuntu:22.04',
      'nginx:alpine',
      'python:3.9-slim',
      'node:20-alpine',
      'redis:7-alpine',
      'postgres:16-alpine',
    ];
  }

  log(msg) {
    console.log(`[DockerManager] ${msg}`);
  }

  error(msg, err) {
    console.error(`[DockerManager] ERROR: ${msg}`, err?.message || err);
  }

  async prewarmImages() {
    this.log('Pre-warming common images...');
    for (const image of this.commonImages) {
      try {
        await execPromise(`docker pull ${image}`);
        this.log(`Pre-warmed: ${image}`);
      } catch (err) {
        this.log(`Failed to pre-warm ${image}: ${err.message}`);
      }
    }
  }

  async getAvailablePort() {
    const inUse = await db('user_environments')
      .select('assigned_port')
      .whereNotNull('assigned_port')
      .whereNull('deleted_at');
    const usedPorts = new Set(inUse.map(e => e.assigned_port));
    for (let p = this.basePort; p < this.basePort + this.portRange; p++) {
      if (!usedPorts.has(p)) return p;
    }
    throw new Error('No available ports in range');
  }

  async getOrCreateNetwork(userId, labId) {
    const networkName = `lab-net-${userId}-${labId}`.substring(0, 64);
    try {
      await execPromise(`docker network inspect ${networkName}`);
      return networkName;
    } catch {
      await execPromise(`docker network create --driver bridge --internal ${networkName}`);
      return networkName;
    }
  }

  async startEnvironment(userId, labId) {
    const user = await db('users').where({ id: userId }).first();
    const lab = await db('labs').where({ id: labId }).whereNull('deleted_at').first();
    if (!lab || !user) throw new Error('Lab or user not found');

    let env = await db('user_environments')
      .where({ user_id: userId, lab_id: labId })
      .whereNull('deleted_at')
      .first();

    if (env && env.container_status === 'running') {
      this.resetTimer(userId, labId, this.expiryMinutes);
      await db('user_environments').where({ id: env.id }).update({ last_active_at: db.fn.now() });
      return {
        port: env.assigned_port,
        wsUrl: `http://localhost:${env.assigned_port}`,
        networkName: env.docker_network_name,
        projectName: env.compose_project_name,
      };
    }

    const projectName = `lab-${userId}-${labId}-${Date.now()}`.substring(0, 64);
    const port = env?.assigned_port || await this.getAvailablePort();
    const networkName = await this.getOrCreateNetwork(userId, labId);

    try {
      this.log(`Spawning ${projectName} on port ${port}, network ${networkName}`);

      const composePath = lab.docker_compose_path || '';
      const relativePath = composePath.startsWith('labs/') ? composePath.substring(5) : composePath;
      const hostComposePath = path.join(this.hostLabsDir, relativePath);

      if (!fs.existsSync(hostComposePath)) {
        throw new Error(`Compose file not found: ${hostComposePath}`);
      }

      const firstService = await this.getFirstServiceName(hostComposePath);
      const overrideContent = this.buildOverride(firstService, projectName, port, networkName);
      const overridePath = `/tmp/override-${projectName}.yml`;
      fs.writeFileSync(overridePath, overrideContent);

      await execPromise(
        `docker compose -p ${projectName} -f "${hostComposePath}" -f "${overridePath}" up -d --build`,
        { env: { ...process.env, COMPOSE_PROJECT_NAME: projectName } }
      );

      try { fs.unlinkSync(overridePath); } catch {}

      let containerId = '';
      try {
        const { stdout } = await execPromise(
          `docker inspect --format='{{.Id}}' "${projectName}_${firstService}_1" 2>/dev/null || docker compose -p ${projectName} ps -q | head -n 1`
        );
        containerId = stdout.trim();
      } catch {
        const { stdout } = await execPromise(`docker compose -p ${projectName} ps -q | head -n 1`);
        containerId = stdout.trim();
      }

      if (containerId) {
        const deadline = Date.now() + 30000;
        while (Date.now() < deadline) {
          try {
            const { stdout } = await execPromise(`docker inspect --format='{{.State.Status}}' "${containerId}"`);
            if (stdout.trim() === 'running') break;
          } catch {}
          await new Promise(r => setTimeout(r, 500));
        }

        this.log(`Container ${containerId} running, starting ttyd on port ${port}`);
        const ttydProc = spawn('ttyd', [
          '-i', '0.0.0.0',
          '-p', port.toString(),
          '-W',
          'docker', 'exec', '-it', containerId, 'sh'
        ]);

        ttydProc.on('error', (err) => this.error(`ttyd spawn error for ${projectName}`, err));
        ttydProc.on('exit', (code) => {
          this.log(`TTYD for ${projectName} exited with code ${code}`);
          this.activeTerminals.delete(projectName);
        });

        this.activeTerminals.set(projectName, ttydProc);
      }

      const expiresAt = new Date(Date.now() + this.expiryMinutes * 60 * 1000);

      if (env) {
        await db('user_environments').where({ id: env.id }).update({
          compose_project_name: projectName,
          docker_network_name: networkName,
          container_status: 'running',
          assigned_port: port,
          cpu_limit: this.cpuLimit,
          memory_limit_mb: this.memoryLimitMb,
          started_at: db.fn.now(),
          expires_at: expiresAt,
          last_active_at: db.fn.now(),
        });
      } else {
        await db('user_environments').insert({
          user_id: userId,
          lab_id: labId,
          compose_project_name: projectName,
          docker_network_name: networkName,
          container_status: 'running',
          assigned_port: port,
          cpu_limit: this.cpuLimit,
          memory_limit_mb: this.memoryLimitMb,
          started_at: db.fn.now(),
          expires_at: expiresAt,
          last_active_at: db.fn.now(),
        });
      }

      this.resetTimer(userId, labId, this.expiryMinutes);

      await this.waitForPort(port, 15000);

      await publishEvent('lab:events', {
        type: 'environment_started',
        userId,
        labId,
        projectName,
        port,
        timestamp: new Date().toISOString(),
      });

      return { port, wsUrl: `http://localhost:${port}`, networkName, projectName };
    } catch (err) {
      this.error('Failed to start environment', err);
      if (env) {
        await db('user_environments').where({ id: env.id }).update({ container_status: 'error' });
      }
      throw err;
    }
  }

  async stopEnvironment(userId, labId) {
    const env = await db('user_environments')
      .where({ user_id: userId, lab_id: labId })
      .whereNull('deleted_at')
      .first();
    if (!env) return;

    try {
      this.log(`Stopping ${env.compose_project_name}`);

      if (this.activeTerminals.has(env.compose_project_name)) {
        const proc = this.activeTerminals.get(env.compose_project_name);
        proc.kill('SIGTERM');
        this.activeTerminals.delete(env.compose_project_name);
      }

      const lab = await db('labs').where({ id: labId }).first();
      const composePath = lab?.docker_compose_path || '';
      const relativePath = composePath.startsWith('labs/') ? composePath.substring(5) : composePath;
      const hostComposePath = path.join(this.hostLabsDir, relativePath);

      if (fs.existsSync(hostComposePath)) {
        await execPromise(`docker compose -p ${env.compose_project_name} -f "${hostComposePath}" down -v`);
      } else {
        await execPromise(`docker compose -p ${env.compose_project_name} down -v`);
      }

      if (env.docker_network_name) {
        try { await execPromise(`docker network rm ${env.docker_network_name}`); } catch {}
      }

      await db('user_environments').where({ id: env.id }).update({
        container_status: 'stopped',
        last_active_at: db.fn.now(),
      });

      this.clearTimer(userId, labId);

      await publishEvent('lab:events', {
        type: 'environment_stopped',
        userId,
        labId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this.error('Failed to stop environment', err);
    }
  }

  async resetEnvironment(userId, labId) {
    await this.stopEnvironment(userId, labId);
    await db('user_environments')
      .where({ user_id: userId, lab_id: labId })
      .update({ deleted_at: db.fn.now() });

    const result = await this.startEnvironment(userId, labId);

    await logAuditEvent({
      actorUserId: userId,
      action: 'lab_environment_reset',
      resourceType: 'environment',
      resourceId: labId,
    });

    return result;
  }

  async forceStopEnvironment(userId, labId) {
    const env = await db('user_environments')
      .where({ user_id: userId, lab_id: labId })
      .whereNull('deleted_at')
      .first();
    if (!env) return;

    try {
      if (this.activeTerminals.has(env.compose_project_name)) {
        const proc = this.activeTerminals.get(env.compose_project_name);
        proc.kill('SIGKILL');
        this.activeTerminals.delete(env.compose_project_name);
      }

      await execPromise(`docker compose -p ${env.compose_project_name} down -v --remove-orphans`);
      if (env.docker_network_name) {
        try { await execPromise(`docker network rm ${env.docker_network_name}`); } catch {}
      }
    } catch (err) {
      this.error('Force stop failed', err);
    }
  }

  async createSnapshot(env) {
    const snapshotName = `snapshot-${env.compose_project_name}-${Date.now()}`;
    const volumeName = `${env.compose_project_name}_data`;

    try {
      await execPromise(`docker commit ${env.compose_project_name} ${snapshotName}:latest`);

      let volumeSnapshot = null;
      try {
        await execPromise(`docker run --rm -v ${volumeName}:/source -v /tmp:/dest alpine tar czf /dest/${snapshotName}.tar.gz -C /source .`);
        volumeSnapshot = `${snapshotName}.tar.gz`;
      } catch {}

      return {
        snapshotName,
        volumeName: volumeSnapshot,
        imageTag: `${snapshotName}:latest`,
      };
    } catch (err) {
      this.error('Snapshot creation failed', err);
      throw err;
    }
  }

  async restoreSnapshot(snapshot) {
    try {
      if (snapshot.docker_image_tag) {
        await execPromise(`docker load -i /tmp/${snapshot.snapshot_name}.tar.gz`);
      }
    } catch (err) {
      this.error('Snapshot restore failed', err);
      throw err;
    }
  }

  async getEnvironmentStats() {
    try {
      const { stdout } = await execPromise(
        `docker stats --no-stream --format '{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.NetIO}}'`
      );
      const lines = stdout.trim().split('\n').filter(Boolean);
      const stats = {};
      for (const line of lines) {
        const [name, cpu, mem, net] = line.split(',');
        stats[name] = { cpu, memory: mem, network: net };
      }
      return stats;
    } catch {
      return {};
    }
  }

  buildOverride(serviceName, projectName, port, networkName) {
    return `
services:
  ${serviceName}:
    container_name: "${projectName}"
    ports:
      - "${port}:8080"
    networks:
      default:
        external:
          name: ${networkName}
    deploy:
      resources:
        limits:
          cpus: '${this.cpuLimit / 1000}'
          memory: ${this.memoryLimitMb}M
`;
  }

  async getFirstServiceName(composePath) {
    try {
      const content = fs.readFileSync(composePath, 'utf8');
      const parsed = yaml.load(content);
      const services = parsed?.services ? Object.keys(parsed.services) : [];
      return services[0] || 'app';
    } catch {
      return 'app';
    }
  }

  resetTimer(userId, labId, minutes) {
    this.clearTimer(userId, labId);
    const timerId = setTimeout(() => {
      this.log(`Auto-cleanup for user ${userId} lab ${labId}`);
      this.stopEnvironment(userId, labId);
    }, minutes * 60 * 1000);
    this.activeTimers.set(`${userId}-${labId}`, timerId);
  }

  clearTimer(userId, labId) {
    const key = `${userId}-${labId}`;
    if (this.activeTimers.has(key)) {
      clearTimeout(this.activeTimers.get(key));
      this.activeTimers.delete(key);
    }
  }

  waitForPort(port, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const net = require('net');
      const start = Date.now();
      const attempt = () => {
        const sock = new net.Socket();
        sock.setTimeout(500);
        sock.on('connect', () => { sock.destroy(); resolve(); });
        sock.on('error', () => {
          sock.destroy();
          if (Date.now() - start > timeoutMs) {
            reject(new Error(`Port ${port} not ready within ${timeoutMs}ms`));
          } else {
            setTimeout(attempt, 300);
          }
        });
        sock.on('timeout', () => {
          sock.destroy();
          if (Date.now() - start > timeoutMs) {
            reject(new Error(`Port ${port} timed out`));
          } else {
            setTimeout(attempt, 300);
          }
        });
        sock.connect(port, '127.0.0.1');
      };
      attempt();
    });
  }
}

module.exports = new DockerManager();
