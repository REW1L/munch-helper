#!/usr/bin/env node

import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../maestro/e2e');
const outputArg = process.argv.indexOf('--output');
const urlArg = process.argv.indexOf('--url');
const output = path.resolve(outputArg >= 0 ? process.argv[outputArg + 1] : '/tmp/munch-maestro-web');
const url = urlArg >= 0 ? process.argv[urlArg + 1] : 'http://localhost:19006';

if (!url || url.startsWith('--')) throw new Error('Usage: prepare-web-flows.mjs [--output DIR] [--url URL]');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const entry of await readdir(root)) {
  const source = path.join(root, entry);
  const destination = path.join(output, entry);
  if (entry.endsWith('.yaml')) {
    const contents = await readFile(source, 'utf8');
    await writeFile(destination, contents.replace(/^appId: .*$/m, `url: ${url}`));
  } else {
    await cp(source, destination, { recursive: true });
  }
}

console.log(output);
