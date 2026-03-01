# Frontend infrastructure

This Pulumi project deploys static frontend artifacts from `../frontend/dist` to a private S3 bucket behind CloudFront.

## Architecture

- S3 bucket (private, public access blocked)
- CloudFront distribution with Origin Access Control (OAC)
- SPA fallback for 403/404 to `/index.html`
- Static artifact upload with cache headers:
  - `_expo/static/**`: long-lived immutable cache
  - `*.html`: no-cache

## Prerequisites

- Node.js and npm
- Pulumi CLI authenticated to your Pulumi backend
- AWS credentials configured for the target account

## Deploy (dev)

1. Install frontend dependencies and build web artifacts:

   ```bash
   cd ../frontend
   npm install
   EXPO_PUBLIC_API_URL=https://your-api-domain npm run export:web
   ```

2. Install infrastructure dependencies:

   ```bash
   cd ../infrastructure
   npm install
   ```

3. Initialize stack (first time only):

   ```bash
   pulumi stack init dev
   ```

4. Configure stack values:

   ```bash
   pulumi config set aws:region eu-central-1
   pulumi config set tabletop-helper-frontend:apiUrl https://your-api-domain
   pulumi config set tabletop-helper-frontend:artifactDir ../frontend/dist
   ```

5. Preview and deploy:

   ```bash
   pulumi preview
   pulumi up
   ```

## Outputs

- `distributionUrl`: frontend URL to open in browser
- `distributionDomainName`: raw CloudFront domain name
- `bucketName`: private artifact bucket name