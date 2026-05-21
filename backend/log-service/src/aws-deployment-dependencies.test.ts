import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
};

const backendRoot = path.basename(process.cwd()) === 'log-service'
  ? path.resolve(process.cwd(), '..')
  : process.cwd();
const samTemplatePath = path.join(backendRoot, 'sam/template.yaml');
const samTemplateDir = path.dirname(samTemplatePath);

function readPackageJson(serviceDir: string): PackageJson {
  return JSON.parse(readFileSync(path.join(serviceDir, 'package.json'), 'utf8')) as PackageJson;
}

function findAwsAuthMongoParameters(template: string): Set<string> {
  const params = new Set<string>();
  const parameterBlockPattern = /^  (\w+MongoUri):\n([\s\S]*?)(?=^  \w|\nGlobals:)/gm;

  for (const match of template.matchAll(parameterBlockPattern)) {
    const [, parameterName, block] = match;

    if (block.includes('authMechanism=MONGODB-AWS')) {
      params.add(parameterName);
    }
  }

  return params;
}

function findServicesUsingAwsAuthMongo(template: string, awsAuthParams: Set<string>): string[] {
  const services = new Set<string>();
  const functionBlockPattern = /^  (\w+Function):\n([\s\S]*?)(?=^  \w+:\n|^Outputs:)/gm;

  for (const match of template.matchAll(functionBlockPattern)) {
    const [, , block] = match;
    const codeUri = block.match(/^\s+CodeUri:\s+(.+)$/m)?.[1]?.trim();

    if (!codeUri) {
      continue;
    }

    const referencedParams = [...block.matchAll(/!Ref\s+(\w+)/g)].map((paramMatch) => paramMatch[1]);
    const usesAwsAuthMongo = referencedParams.some((param) => awsAuthParams.has(param));

    if (usesAwsAuthMongo) {
      services.add(path.resolve(samTemplateDir, codeUri));
    }
  }

  return [...services].sort();
}

describe('AWS deployment dependencies', () => {
  it('declares aws4 for every SAM service using MongoDB AWS authentication', () => {
    const template = readFileSync(samTemplatePath, 'utf8');
    const awsAuthParams = findAwsAuthMongoParameters(template);
    const serviceDirs = findServicesUsingAwsAuthMongo(template, awsAuthParams);

    expect(serviceDirs.length).toBeGreaterThan(0);

    const missingAws4 = serviceDirs
      .map((serviceDir) => ({ serviceDir, packageJson: readPackageJson(serviceDir) }))
      .filter(({ packageJson }) => !packageJson.dependencies?.aws4)
      .map(({ serviceDir, packageJson }) => packageJson.name ?? path.basename(serviceDir));

    expect(missingAws4).toEqual([]);
  });
});
