# Architecture - Infrastructure

## Executive Summary

The infrastructure stack hosts the Expo web export of Munch Helper at `https://helpamunch.click`. It is a Pulumi (TypeScript) project that creates a private S3 bucket, a CloudFront distribution with three origins (S3 for static, the backend HTTP API, the backend WebSocket API), and Route 53 alias records. It reads outputs from the backend SAM stack to discover the API and WebSocket endpoints, so the web client can stay single-origin.

Backend infrastructure (Lambdas, API Gateways, SNS, IAM) is owned by `backend/sam/template.yaml` and deployed via SAM, not Pulumi. The Pulumi stack only owns frontend hosting.

## Technology Stack

| Category | Technology | Version | Notes |
|---|---|---|---|
| IaC engine | Pulumi | ^3.203.0 | TypeScript, commonjs target. |
| Cloud SDK | @pulumi/aws | ^7.10.0 | Native CloudFormation passthrough provider. |
| Static asset uploader | Built-in `aws.s3.BucketObjectv2` | n/a | One per file; cache-control derived from path. |
| MIME detection | mime-types | ^2.1.35 | Used during file upload. |
| Hosted zone | Route 53 | n/a | Existing public hosted zone for `helpamunch.click`. |
| Certificate | AWS Certificate Manager | n/a | Pre-existing certificate in `us-east-1` for `helpamunch.click`. |
| CDN | CloudFront | n/a | OAC-based S3 access; Managed-CachingDisabled + Managed-AllViewerExceptHostHeader policies for API and WS origins. |

The stack name is `munch-helper-frontend`. The dev stack file is `Pulumi.dev.yaml`; AWS region is `eu-central-1` (the certificate is in `us-east-1` since CloudFront only accepts ACM certs from that region).

## Architecture Diagram

```text
                       ┌────────────────────────────────────┐
                       │           helpamunch.click         │
                       │     (Route 53 A + AAAA aliases)    │
                       └───────────────┬────────────────────┘
                                       ▼
                          ┌─────────────────────────────┐
                          │       CloudFront (OAC)      │
                          ├─────────────────────────────┤
                          │ default → frontendS3Origin  │
                          │ /api/*  → apiOrigin         │
                          │ /ws     → webSocketApiOrigin│
                          │ /ws/*   → webSocketApiOrigin│
                          │ 403/404 → /index.html (200) │
                          └────┬─────────┬──────────────┘
                               │         │
                  TLS to S3    │         │ HTTPS to API Gateway
                               ▼         ▼
   ┌────────────────────────────┐  ┌─────────────────────────┐
   │ S3 bucket (private)        │  │ HTTP API (api stage)    │
   │ munch-helper-frontend-     │  │ + WebSocket API (ws)    │
   │ ${accountId}-sandbox       │  │ from backend SAM stack  │
   └────────────────────────────┘  └─────────────────────────┘
```

## Architecture Pattern

**Origin-multiplexing CDN with backend-stack discovery**. The web client never reaches the backend directly: every request goes to `helpamunch.click`, and CloudFront's ordered cache behaviors route by path:

- `/api/*` → `apiOrigin` (HTTP API base hostname extracted from backend stack output `ApiBaseUrl`).
- `/ws` and `/ws/*` → `webSocketApiOrigin` (WebSocket API hostname extracted from `WebSocketApiUrl`).
- everything else → `frontendS3Origin`.

Both API and WS behaviors use:

- Cache policy `Managed-CachingDisabled` (no caching of dynamic responses).
- Origin request policy `Managed-AllViewerExceptHostHeader` (forwards everything except Host so the API Gateway hostname is honored upstream).
- Allowed methods `GET, HEAD, OPTIONS, PUT, PATCH, POST, DELETE`; cached methods `GET, HEAD, OPTIONS`.

The static origin uses `Managed-CachingOptimized` (id `658327ea-f89d-4fab-a63d-7e88639e58f6`) with default behavior set to `redirect-to-https`.

## Resources Created

### S3

- `frontendBucket` - private bucket `munch-helper-frontend-${accountId}-sandbox`. `forceDestroy: false`, so a destroy attempt will fail until the bucket is emptied.
- `frontendBucketPublicAccessBlock` - all four block flags enabled.
- `frontendBucketOwnershipControls` - `BucketOwnerEnforced` (no ACLs).
- `frontendBucketPolicy` - allows `s3:GetObject` only when the source ARN equals the CloudFront distribution ARN. Constructed with `aws.iam.getPolicyDocumentOutput`.

### CloudFront

- `frontendOriginAccessControl` - SigV4 OAC for the S3 origin.
- `frontendDistribution` - the distribution itself. SPA fallback is achieved with two `customErrorResponses` entries for 403 and 404, both rewriting to `/index.html` with status 200.
- `viewerCertificate.acmCertificateArn` - looked up via `aws.acm.getCertificate({ domain: 'helpamunch.click', region: 'us-east-1', types: ['AMAZON_ISSUED'], mostRecent: true })`.

### Route 53

- `frontendAliasARecord` - A record alias `helpamunch.click` → distribution.
- `frontendAliasAaaaRecord` - AAAA alias for IPv6 reachability.

The hosted zone is **looked up**, not created (`aws.route53.getZoneOutput({ name: 'helpamunch.click.', privateZone: false })`) - so the zone must already exist before this stack runs.

### Static asset upload

`collectFiles(artifactDir)` recursively walks `frontend/dist`, then per file:

- Hashes the relative path with SHA-1 → first 12 hex chars become the resource name suffix (`frontendAsset-<12-hex>`). This keeps Pulumi resource names stable and short.
- Determines `contentType` via `mime-types` (default `application/octet-stream`).
- Computes `cacheControl`:
  - HTML: `no-cache, no-store, must-revalidate` (so the SPA shell always re-validates).
  - `_expo/static/**`: `public, max-age=31536000, immutable` (Expo hashes these).
  - everything else: `public, max-age=86400` (1 day).

The artifact directory must exist at `pulumi up` time; the stack throws otherwise (`Frontend artifacts directory not found at <artifactDir>. Run "npm run export:web" in ../frontend before "pulumi up".`).

## Backend Stack Discovery

```ts
const backend = aws.cloudformation.getStack({
  name: "munch-helper-user-service",
  region: "eu-central-1",
});
const apiOriginUrl = backend.then(stack => stack.outputs?.ApiBaseUrl);
const apiOriginDomainName = apiOriginUrl.then(url => new URL(url).hostname);
const webSocketApiOriginUrl = backend.then(stack => stack.outputs?.WebSocketApiUrl);
const webSocketApiOriginDomainName = webSocketApiOriginUrl.then(url => new URL(url).hostname);
```

The backend stack name is hard-coded. If the SAM stack is renamed, this lookup must change. The outputs `ApiBaseUrl` and `WebSocketApiUrl` are part of the SAM template's `Outputs` block and must remain stable.

## Configuration

Two configs only:

| Key | Default | Source |
|---|---|---|
| `aws:region` | `eu-central-1` | `Pulumi.dev.yaml` |
| `munch-helper-frontend:artifactDir` | `../frontend/dist` | `Pulumi.yaml` (default) and overridable via `pulumi config set` |

There are no secrets in the stack file - the encrypted passphrase in `Pulumi.dev.yaml` is the Pulumi config encryption key, not an AWS secret.

## Source Tree

See [Source Tree Analysis](./source-tree-analysis.md#infrastructure) for the file layout (`infrastructure/index.ts` is the entire stack).

## Development Workflow

See [Development Guide - Infrastructure](./development-guide-infrastructure.md) for commands and the `pulumi preview`/`pulumi up`/`pulumi destroy` lifecycle.

## Deployment

### Local

1. Build the web export from `frontend/`:

   ```bash
   EXPO_PUBLIC_API_URL=https://helpamunch.click npm run export:web
   ```
2. Run from `infrastructure/`:

   ```bash
   npm install
   pulumi stack init dev      # first time only
   pulumi config set aws:region eu-central-1
   pulumi config set munch-helper-frontend:artifactDir ../frontend/dist
   pulumi preview
   pulumi up
   ```
3. Outputs to look at:
   - `artifactsPath` (the resolved absolute path to `frontend/dist` so reviewers can confirm what was uploaded).

### CI

`.github/workflows/frontend-infra-cd.yml` runs the same flow on `main`:

1. Build job: lint, typecheck, test, `expo export --platform web --clear`. Artifacts uploaded as `frontend-dist`.
2. Deploy job: download `frontend-dist` to `frontend/dist`, OIDC-assume `AWS_DEPLOY_ROLE_NAME`, run `pulumi up` via `pulumi/actions@v4` against `${{ vars.PULUMI_STACK_NAME }}` and `${{ secrets.PULUMI_CLOUD_URL }}`.

## Known Constraints and Tradeoffs

- **The backend stack name is hard-coded.** Renaming the SAM stack means changing the Pulumi `aws.cloudformation.getStack({ name: ... })` call. Both deploys must be coordinated.
- **The certificate must already exist in `us-east-1`** before `pulumi up` will succeed. The cert is looked up by domain via `aws.acm.getCertificate(...mostRecent: true)`, which means rotating to a new issuer requires either deleting the old certificate first or waiting for `mostRecent` to flip naturally.
- **`forceDestroy: false`** on the bucket. This is intentional to avoid accidental data loss but means a `pulumi destroy` requires emptying the bucket first.
- **No staging stack today.** `Pulumi.dev.yaml` is the only stack file; production reuses the same stack via the `PULUMI_STACK_NAME` repo variable. To add staging, copy the file, change the cert lookup criteria, and parameterize the certificate ARN.
- **Cache invalidation is not automatic.** Pulumi recreates `BucketObjectv2` resources whose source content changed (because Pulumi notices the asset hash drift), but CloudFront serves cached responses for the lifetime declared by `cacheControl`. HTML is `no-cache`, so SPA shell updates flow through immediately. Static assets under `_expo/static/**` are content-hashed by Expo, so cache-bust is not needed.
- **No WAF or rate limiter.** CloudFront is plain. Any future bot/abuse mitigation needs to be added either as a managed rule group on this distribution or upstream at the API Gateway.
- **CloudFront does not authenticate the WebSocket upgrade.** The protocol is opaque to CloudFront's match. Origin protocol policy is `https-only`, which is what API Gateway WebSocket requires.

## Diagrams of Cache Behaviors

```text
defaultCacheBehavior (S3 origin)
    cachePolicyId       = Managed-CachingOptimized
    viewerProtocolPolicy = redirect-to-https
    allowedMethods      = GET HEAD OPTIONS

orderedCacheBehaviors (in order)
  1. /ws       → webSocketApiOrigin
                  cachePolicyId = Managed-CachingDisabled
                  originRequestPolicyId = Managed-AllViewerExceptHostHeader
                  allowedMethods = all 7 verbs

  2. /ws/*     → webSocketApiOrigin (same policies)

  3. /api/*    → apiOrigin           (same policies)
```

The order matters: `/ws/*` comes before `/api/*` because both could match a long URL, and CloudFront uses the first matching pattern.

## Adding a New Route Pattern

1. If the pattern lives under the same WS or HTTP API origin, add another entry to `orderedCacheBehaviors`. Place more specific patterns before more general ones.
2. If it needs a new origin (e.g., a future image CDN), add an entry to `origins` and a corresponding cache behavior.
3. Add the policy ids you need; reuse the managed-policy lookups already in the file rather than hard-coding ids (the managed policy ARNs in AWS are stable, but `getCachePolicy(...).id` is documented and survives policy renames).
