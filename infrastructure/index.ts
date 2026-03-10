import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as mime from "mime-types";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

const config = new pulumi.Config();
const artifactDirConfig = config.get("artifactDir") ?? "../frontend/dist";
const artifactDir = path.resolve(__dirname, artifactDirConfig);
const backend = aws.cloudformation.getStack({
  name: "munch-helper-user-service",
  region: "eu-central-1",
});
const apiOriginUrl = backend.then(stack => stack.outputs?.ApiBaseUrl);
const apiOriginDomainName = apiOriginUrl.then(url => new URL(url).hostname);
const cachePolicyCachingOptimizedId = "658327ea-f89d-4fab-a63d-7e88639e58f6";
const cachePolicyCachingDisabled = aws.cloudfront.getCachePolicyOutput({
  name: "Managed-CachingDisabled",
});
const originRequestPolicyAllViewerExceptHostHeader = aws.cloudfront.getOriginRequestPolicyOutput({
  name: "Managed-AllViewerExceptHostHeader",
});
const cachePolicyCachingDisabledId = pulumi.output(cachePolicyCachingDisabled.id).apply((id) => {
  if (!id) {
    throw new Error("Unable to resolve CloudFront managed cache policy: Managed-CachingDisabled");
  }
  return id;
});
const originRequestPolicyAllViewerExceptHostHeaderId = pulumi
  .output(originRequestPolicyAllViewerExceptHostHeader.id)
  .apply((id) => {
    if (!id) {
      throw new Error("Unable to resolve CloudFront managed origin request policy: Managed-AllViewerExceptHostHeader");
    }
    return id;
  });
const customDomainName = "helpamunch.click";
const customCertificateArn = aws.acm.getCertificate({
  domain: customDomainName,
  region: "us-east-1",
  types: ["AMAZON_ISSUED"],
  mostRecent: true,
}).then(cert => cert.arn);

if (!fs.existsSync(artifactDir)) {
  throw new Error(
    `Frontend artifacts directory not found at ${artifactDir}. Run \"npm run export:web\" in ../frontend before \"pulumi up\".`
  );
}
const accountId = aws.getCallerIdentity({}).then(current => current.accountId);

const bucket = new aws.s3.Bucket("frontendBucket", {
  bucket: pulumi.interpolate`munch-helper-frontend-${accountId}-sandbox`,
  forceDestroy: false,
});

new aws.s3.BucketPublicAccessBlock("frontendBucketPublicAccessBlock", {
  bucket: bucket.id,
  blockPublicAcls: true,
  blockPublicPolicy: true,
  ignorePublicAcls: true,
  restrictPublicBuckets: true,
});

new aws.s3.BucketOwnershipControls("frontendBucketOwnershipControls", {
  bucket: bucket.id,
  rule: {
    objectOwnership: "BucketOwnerEnforced",
  },
});

const originAccessControl = new aws.cloudfront.OriginAccessControl("frontendOriginAccessControl", {
  description: "OAC for frontend S3 origin",
  originAccessControlOriginType: "s3",
  signingBehavior: "always",
  signingProtocol: "sigv4",
});

const distribution = new aws.cloudfront.Distribution("frontendDistribution", {
  enabled: true,
  defaultRootObject: "index.html",
  aliases: [customDomainName],
  origins: [
    {
      originId: "frontendS3Origin",
      domainName: bucket.bucketRegionalDomainName,
      originAccessControlId: originAccessControl.id,
      s3OriginConfig: {
        originAccessIdentity: "",
      },
    },
    {
      originId: "apiOrigin",
      domainName: apiOriginDomainName,
      customOriginConfig: {
        httpPort: 80,
        httpsPort: 443,
        originProtocolPolicy: "https-only",
        originSslProtocols: ["TLSv1.2"],
      },
    },
  ],
  orderedCacheBehaviors: [
    {
      pathPattern: "/api/*",
      targetOriginId: "apiOrigin",
      viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: ["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "POST", "DELETE"],
      cachedMethods: ["GET", "HEAD", "OPTIONS"],
      compress: true,
      cachePolicyId: cachePolicyCachingDisabledId,
      originRequestPolicyId: originRequestPolicyAllViewerExceptHostHeaderId,
    },
  ],
  defaultCacheBehavior: {
    targetOriginId: "frontendS3Origin",
    viewerProtocolPolicy: "redirect-to-https",
    allowedMethods: ["GET", "HEAD", "OPTIONS"],
    cachedMethods: ["GET", "HEAD", "OPTIONS"],
    compress: true,
    cachePolicyId: cachePolicyCachingOptimizedId,
  },
  restrictions: {
    geoRestriction: {
      restrictionType: "none",
    },
  },
  customErrorResponses: [
    {
      errorCode: 403,
      responseCode: 200,
      responsePagePath: "/index.html",
      errorCachingMinTtl: 0,
    },
    {
      errorCode: 404,
      responseCode: 200,
      responsePagePath: "/index.html",
      errorCachingMinTtl: 0,
    },
  ],
  viewerCertificate: {
    acmCertificateArn: customCertificateArn,
    sslSupportMethod: "sni-only",
    minimumProtocolVersion: "TLSv1.2_2021",
  },
});

const hostedZone = aws.route53.getZoneOutput({
  name: `${customDomainName}.`,
  privateZone: false,
});

new aws.route53.Record("frontendAliasARecord", {
  zoneId: hostedZone.zoneId,
  name: customDomainName,
  type: "A",
  aliases: [
    {
      name: distribution.domainName,
      zoneId: distribution.hostedZoneId,
      evaluateTargetHealth: false,
    },
  ],
});

new aws.route53.Record("frontendAliasAaaaRecord", {
  zoneId: hostedZone.zoneId,
  name: customDomainName,
  type: "AAAA",
  aliases: [
    {
      name: distribution.domainName,
      zoneId: distribution.hostedZoneId,
      evaluateTargetHealth: false,
    },
  ],
});

const bucketPolicyDocument = aws.iam.getPolicyDocumentOutput({
  statements: [
    {
      sid: "AllowCloudFrontServicePrincipalReadOnly",
      actions: ["s3:GetObject"],
      principals: [
        {
          type: "Service",
          identifiers: ["cloudfront.amazonaws.com"],
        },
      ],
      resources: [pulumi.interpolate`${bucket.arn}/*`],
      conditions: [
        {
          test: "StringEquals",
          variable: "AWS:SourceArn",
          values: [distribution.arn],
        },
      ],
    },
  ],
});

new aws.s3.BucketPolicy("frontendBucketPolicy", {
  bucket: bucket.id,
  policy: bucketPolicyDocument.json,
});

const collectFiles = (directory: string): string[] => {
  const dirEntries = fs.readdirSync(directory, { withFileTypes: true });
  return dirEntries.flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(entryPath);
    }
    return [entryPath];
  });
};

const files = collectFiles(artifactDir);

files.forEach((filePath) => {
  const relativeFilePath = path.relative(artifactDir, filePath).split(path.sep).join("/");
  const objectNameHash = createHash("sha1").update(relativeFilePath).digest("hex").slice(0, 12);
  const isHtml = relativeFilePath.endsWith(".html");
  const isImmutableAsset = relativeFilePath.startsWith("_expo/static/");
  const contentType = mime.lookup(filePath) || "application/octet-stream";

  const cacheControl = isHtml
    ? "no-cache, no-store, must-revalidate"
    : isImmutableAsset
      ? "public, max-age=31536000, immutable"
      : "public, max-age=86400";

  new aws.s3.BucketObjectv2(`frontendAsset-${objectNameHash}`, {
    bucket: bucket.id,
    key: relativeFilePath,
    source: new pulumi.asset.FileAsset(filePath),
    contentType,
    cacheControl,
  });
});

export const artifactsPath = artifactDir;
