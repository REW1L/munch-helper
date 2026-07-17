import { spawnSync } from 'node:child_process';

const args = [
  'compose',
  '-f',
  'backend/docker-compose.local.yml',
  '-f',
  'backend/docker-compose.e2e.yml',
  'down',
  '--remove-orphans',
];
if (process.env.CI === 'true' || process.argv.includes('--volumes')) args.push('--volumes');
const result = spawnSync('docker', args, { stdio: 'inherit' });
process.exit(result.status ?? 1);
