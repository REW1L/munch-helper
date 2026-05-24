# Development Guide - Infrastructure

## Prerequisites

- Node.js + npm.
- Pulumi CLI authenticated to your Pulumi backend (`pulumi login`).
- AWS credentials with permission to read CloudFormation outputs from the backend stack and create S3 / CloudFront / Route 53 / IAM resources.
- A pre-existing ACM certificate for `helpamunch.click` in `us-east-1` (CloudFront requirement).
- A pre-existing public Route 53 hosted zone for `helpamunch.click`.
- A working backend SAM stack named `munch-helper-user-service` in `eu-central-1` (the Pulumi stack reads its outputs).

## Local Setup

```bash
cd infrastructure
npm install
```

The infrastructure project is independent of the backend and frontend npm workspaces; it has its own `package.json` and `package-lock.json`.

The very first time on a workstation:

```bash
pulumi stack init dev
pulumi config set aws:region eu-central-1
pulumi config set munch-helper-frontend:artifactDir ../frontend/dist
```

`Pulumi.dev.yaml` is committed; an `encryptionsalt` value is included so Pulumi can decrypt config values. If you create a new stack, the salt is regenerated for you.

## Building the Frontend Artifacts

The Pulumi stack will refuse to run if `../frontend/dist` does not exist. Build it from the frontend project before deploying:

```bash
cd ../frontend
EXPO_PUBLIC_API_URL=https://your-api-domain npm run export:web
```

For production deploys this URL must be `https://helpamunch.click` (the same hostname the CDN serves). For staging, use whatever URL the staging backend is reachable at.

## Preview / Up / Destroy

```bash
cd infrastructure
pulumi preview      # diff
pulumi up           # apply (interactive)
pulumi up -y        # apply non-interactive
pulumi destroy      # tear down everything except the bucket (forceDestroy: false)
```

To destroy the bucket as well:

1. Empty it manually: `aws s3 rm s3://<bucket-name> --recursive`.
2. Run `pulumi destroy` again (the bucket resource is in the stack; once empty it can be deleted).

## Outputs

```bash
pulumi stack output
```

Currently only `artifactsPath` is exported (the resolved absolute path to `frontend/dist`). The CloudFront domain and bucket name are visible via `pulumi stack`/`pulumi show` but not exported, since DNS already aliases them to `helpamunch.click`.

## CI Deploy

`.github/workflows/frontend-infra-cd.yml` runs the same flow on `main`:

1. Build job: lint, typecheck, test, `expo export --platform web --clear`. Artifacts uploaded as `frontend-dist`.
2. Deploy job: download `frontend-dist` to `frontend/dist`, OIDC-assume `AWS_DEPLOY_ROLE_NAME`, run `pulumi up` via `pulumi/actions@v4` against `${{ vars.PULUMI_STACK_NAME }}` and `${{ secrets.PULUMI_CLOUD_URL }}`.

CI requires:

- `vars.AWS_ACCOUNT_ID`, `vars.AWS_REGION`, `vars.API_BASE_URL` (or matching secrets), `vars.AWS_DEPLOY_ROLE_NAME`, `vars.PULUMI_STACK_NAME`.
- `secrets.PULUMI_CLOUD_URL`, `secrets.PULUMI_CONFIG_PASSPHRASE`.

The `Validate Required Inputs` step fails the workflow if any of these is missing.

## Common Tasks

### Roll back a deployment

```bash
pulumi stack history
pulumi update --refresh                  # refresh state from cloud first
pulumi stack export --version <prev> > prev.json
pulumi stack import < prev.json
pulumi up                                # re-apply the previous state
```

In practice, rolling back the frontend means redeploying the previous frontend artifact: check out the commit, rebuild the web export, and run `pulumi up`. The infrastructure resources rarely change between releases.

### Invalidate the cache after a deploy

CloudFront serves SPA shell HTML with `no-cache, no-store, must-revalidate`, so HTML changes propagate within a few seconds. Static assets under `_expo/static/**` are content-hashed by Expo and use `immutable, max-age=31536000`, so cache busting happens automatically when the file name changes.

If a non-hashed asset (e.g., something at the bucket root) was updated and you need to flush its cached copy:

```bash
aws cloudfront create-invalidation --distribution-id <id> --paths "/<file>"
```

The distribution id is visible in `pulumi show`.

### Switch the backend region

The stack is hard-coded to `eu-central-1` for the backend stack lookup (`aws.cloudformation.getStack({ name: 'munch-helper-user-service', region: 'eu-central-1' })`). To switch:

1. Update the region in `infrastructure/index.ts`.
2. Update `Pulumi.dev.yaml#config.aws:region` if the frontend should also move.
3. Redeploy.

## Adding a New CloudFront Behavior

1. Add another entry to `orderedCacheBehaviors` in `infrastructure/index.ts`. Keep more specific path patterns earlier than more general ones (CloudFront uses the first matching pattern).
2. Use the existing managed-policy lookups (`cachePolicyCachingDisabledId`, `originRequestPolicyAllViewerExceptHostHeaderId`) where possible rather than hard-coding ids.
3. If the behavior needs a new origin, add an entry to `origins` first, mirroring `apiOrigin` or `webSocketApiOrigin`.

## Notes on Drift

Because the infrastructure is small and read-mostly, drift is rare. If `pulumi preview` reports unexpected changes:

- Check whether the backend SAM stack's outputs (`ApiBaseUrl`, `WebSocketApiUrl`) changed - they would propagate to the apiOrigin/webSocketApiOrigin domain names.
- Check whether the ACM certificate was rotated or replaced - `mostRecent: true` could pick a new cert ARN.
- Check whether anyone has manually edited the bucket policy or distribution behaviors in the AWS console.

`pulumi refresh` brings the state file back in sync with reality, but does not mutate the cloud; follow it with `pulumi up` if you want Pulumi to reassert the desired state.
