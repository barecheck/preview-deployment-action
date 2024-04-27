# Preview deployment action

> [!WARNING]  
> The action is in testing and it's not recommended to use in production environments.

The work you can find here is inspired by Vercel Preview deployments and this is an attempt to create great Pull requests review experience if you are already deploying your website to AWS S3.

Github Action to deploy your static website on AWS S3. The action is only
availabke to use as part of your Pull request workflow and does the following:

- Create AWS Cloudfront (one for all preview deployments)
- Create AWS S3 Bucket (one for all preview deployments)
- Create Route53 and Cloudfront links based on Pull request name
- Sync build folder and S3 content

## Usage

```yaml
name: Preview Deployment

on:
  pull_request:
    types:
      - opened
      - synchronize
      - reopened
      - closed

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Use Node.js v20.9.0
        uses: actions/setup-node@v1
        with:
          node-version: v20.9.0

      - name: Run deployment preview
        id: s3-preview-deployment-action
        uses: ./
        with:
          # The action should run after your static file are built
          build-dir: YOU_STATIC_FILES_OUT_DIR
          # App name will be used to create AWS resources.
          app-name: YOUR_APP_NAME
          # Preview deployments will add `preview-{PR-number}` as subdomain to this domain
          domain: YOUR_DOMAIN_NAME
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: ${{ secrets.AWS_REGION }}
          AWS_ACCOUNT_ID: ${{ secrets.AWS_ACCOUNT_ID }}
          AWS_CLOUDFRONT_CERTIFICATE_ARN: ${{ secrets.AWS_CLOUDFRONT_CERTIFICATE_ARN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
