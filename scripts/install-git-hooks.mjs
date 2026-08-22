import { spawnSync } from 'node:child_process';

const runGit = (args) => spawnSync('git', args, { encoding: 'utf8' });
const root = runGit(['rev-parse', '--show-toplevel']);

if (root.status !== 0) {
  console.log('Skipping Git hook installation: not in a Git worktree.');
  process.exit(0);
}

const repositoryRoot = root.stdout.trim();
const configured = runGit(['-C', repositoryRoot, 'config', 'core.hooksPath', '.githooks']);

if (configured.status !== 0) {
  process.stderr.write(configured.stderr || 'Could not configure Git hooks.\n');
  process.exit(configured.status ?? 1);
}

console.log('Installed repository Git hooks.');
