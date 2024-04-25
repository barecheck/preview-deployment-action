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
steps:
   - name: Run deployment preview
      id: s3-preview-deployment-action
      uses: @barecheck/preview-deployment-action@v1
      with:
         build-dir: ./example
         app-name: YOUR_APP_NAME
         domain: YOUR_DOMAIN
      env:
         AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
         AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
         AWS_REGION: ${{ secrets.AWS_REGION }}
         AWS_ACCOUNT_ID: ${{ secrets.AWS_ACCOUNT_ID }}
         AWS_CLOUDFRONT_CERTIFICATE_ARN: ${{ secrets.AWS_CLOUDFRONT_CERTIFICATE_ARN }}
         GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
