import * as core from "@actions/core"
import { context } from "@actions/github"

import { createCloudfront } from "./aws/cloudfront"
import { setupS3Bucket, syncFiles, updateBucketPolicy } from "./aws/s3"
import { createRoute53Record } from "./aws/route53"
import { getAppName, getBuidDir, getDomainName } from "./config"

type CreateAwsResourcesInputParams = {
  bucketName: string
  domainName: string
  previewSubDomain: string
}

async function createAwsResources({
  bucketName,
  domainName,
  previewSubDomain,
}: CreateAwsResourcesInputParams) {
  // TODO: Ability to give custom region for S3 bucket
  const originId = `${bucketName}.s3.us-east-1.amazonaws.com`
  await setupS3Bucket(bucketName)
  const cloudfront = await createCloudfront(originId)
  await updateBucketPolicy(bucketName, cloudfront.id)

  await createRoute53Record({
    domainName,
    recordName: `${previewSubDomain}.${domainName}`,
    routeTrafficTo: cloudfront.domainName,
  })

  return cloudfront
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const buildDir = getBuidDir()
    const appName = getAppName()
    const domainName = getDomainName()
    const pullRequestNumber = context.payload.pull_request?.number
    const previewSubDomain = pullRequestNumber
      ? `preview-${pullRequestNumber}`
      : "preview"
    const bucketName = `${appName}-preview-deployment`

    await createAwsResources({
      bucketName,
      domainName,
      previewSubDomain,
    })

    await syncFiles({
      bucketName,
      prefix: previewSubDomain,
      directory: buildDir,
    })

    core.setOutput("url", `https://${previewSubDomain}.${domainName}`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
