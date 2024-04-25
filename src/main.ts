import * as core from "@actions/core"
import { context } from "@actions/github"

import { createCloudfront } from "./aws/cloudfront"
import { setupS3Bucket, syncFiles, updateBucketPolicy } from "./aws/s3"
import { createRoute53Record } from "./aws/route53"
import { getAppName, getBuidDir, getDomainName } from "./config"

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    console.log("Running action with context:", context)
    const buildDir = getBuidDir()
    const appName = getAppName()
    const domainName = getDomainName()
    const pullRequestNumber = context.payload.pull_request?.number
    const subDomain = pullRequestNumber
      ? `preview-${pullRequestNumber}`
      : "preview"
    const bucketName = `${appName}-preview-deployment`
    const originId = `${bucketName}.s3.us-east-1.amazonaws.com`

    // TODO: Refactor so infra setup is called only once.
    // S3 bucket could store metadata about the deployment and be used to check if the infra is already setup.
    // The bucket could also store Cloudfront distribution ID and Route53 record IDs for easy cleanup.
    await setupS3Bucket(bucketName)
    const cloudfront = await createCloudfront(originId)
    await updateBucketPolicy(bucketName, cloudfront.id)
    await createRoute53Record({
      domainName,
      recordName: `${subDomain}.${domainName}`,
      routeTrafficTo: cloudfront.domainName,
    })

    await syncFiles({
      bucketName,
      prefix: subDomain,
      directory: buildDir,
    })

    core.setOutput("url", `https://${subDomain}.${domainName}`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
