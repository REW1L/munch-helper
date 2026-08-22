import { spawnSync } from 'node:child_process';

const compose = [
  'compose',
  '-f',
  'backend/docker-compose.local.yml',
  '-f',
  'backend/docker-compose.e2e.yml',
];
const fresh = process.env.CI === 'true' || process.argv.includes('--fresh');
const result = spawnSync('docker', [...compose, 'up', '--build', '-d', ...(fresh ? ['--renew-anon-volumes'] : [])], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);

// Compose recreates backend services when their image changes, but leaves an
// already-running nginx container in place. Nginx resolves upstream service
// names at startup, so restart it after any service recreation to avoid stale
// container IPs producing intermittent 502s in E2E runs.
const nginxRestart = spawnSync('docker', [...compose, 'restart', 'nginx'], { stdio: 'inherit' });
if (nginxRestart.status !== 0) process.exit(nginxRestart.status ?? 1);

const deadline = Date.now() + Number(process.env.E2E_STACK_TIMEOUT_MS ?? 120_000);
const requiredServices = ['munch-nginx', 'munch-user-service', 'munch-room-service', 'munch-character-service', 'munch-room-notifications-service'];

async function ready() {
  const gateway = await fetch('http://localhost:8080/health').catch(() => null);
  if (!gateway?.ok) return false;
  const services = spawnSync('docker', [...compose, 'ps', '--format', 'json'], { encoding: 'utf8' });
  if (services.status !== 0) return false;
  const running = services.stdout.split('\n').filter(Boolean).map((line) => JSON.parse(line));
  return requiredServices.every((name) => running.some((service) => service.Name === name && service.State === 'running'));
}

while (Date.now() < deadline) {
  if (await ready()) {
    console.log('E2E backend stack is ready at http://localhost:8080');
    process.exit(0);
  }
  await new Promise((resolve) => setTimeout(resolve, 1_000));
}

spawnSync('docker', [...compose, 'ps'], { stdio: 'inherit' });
console.error('Timed out waiting for the E2E backend stack.');
process.exit(1);
