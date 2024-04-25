# Preview deployment action

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

## Publishing a New Release

This project includes a helper script, [`script/release`](./script/release)
designed to streamline the process of tagging and pushing new releases for
GitHub Actions.

GitHub Actions allows users to select a specific version of the action to use,
based on release tags. This script simplifies this process by performing the
following steps:

1. **Retrieving the latest release tag:** The script starts by fetching the most
   recent release tag by looking at the local data available in your repository.
1. **Prompting for a new release tag:** The user is then prompted to enter a new
   release tag. To assist with this, the script displays the latest release tag
   and provides a regular expression to validate the format of the new tag.
1. **Tagging the new release:** Once a valid new tag is entered, the script tags
   the new release.
1. **Pushing the new tag to the remote:** Finally, the script pushes the new tag
   to the remote repository. From here, you will need to create a new release in
   GitHub and users can easily reference the new tag in their workflows.
