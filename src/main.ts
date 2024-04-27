import * as core from "@actions/core"
import { context } from "@actions/github"

import { createCloudfront } from "./aws/cloudfront"
import {
  setupS3Bucket,
  syncFiles,
  updateBucketPolicy,
  deleteObjectsByPrefix,
} from "./aws/s3"
import { createRoute53Record, deleteRoute53Record } from "./aws/route53"
import {
  startDeployment,
  updateDeploymentStatus,
  deleteDeployments,
} from "./github/deployments"
import { getAppName, getBuidDir, getDomainName } from "./config"

type CreateAwsResourcesInputParams = {
  bucketName: string
  domainName: string
  environment: string
}

async function createAwsResources({
  bucketName,
  domainName,
  environment,
}: CreateAwsResourcesInputParams) {
  // TODO: Ability to give custom region for S3 bucket
  const originId = `${bucketName}.s3.us-east-1.amazonaws.com`
  await setupS3Bucket(bucketName)
  const cloudfront = await createCloudfront(originId)
  await updateBucketPolicy(bucketName, cloudfront.id)

  await createRoute53Record({
    domainName,
    recordName: `${environment}.${domainName}`,
    routeTrafficTo: cloudfront.domainName,
  })

  return cloudfront
}

type EnvironmentActionParams = {
  appName: string
  domainName: string
  environment: string
  bucketName: string
  branchName: string
  pullRequestNumber: number
}

async function createPreviewEnvironment({
  domainName,
  environment,
  bucketName,
  branchName,
}: EnvironmentActionParams) {
  const buildDir = getBuidDir()
  const previewUrl = `https://${environment}.${domainName}`

  await createAwsResources({
    bucketName,
    domainName,
    environment,
  })

  const deploymentId = await startDeployment(environment, branchName)
  await syncFiles({
    bucketName,
    prefix: environment,
    directory: buildDir,
  })

  // Deployments are not failing Github action if anything goes wrong during creation
  if (deploymentId)
    await updateDeploymentStatus({
      deploymentId,
      status: "success",
      previewUrl,
      environment,
    })

  core.setOutput("url", previewUrl)
}

async function deletePreviewEnvironment({
  domainName,
  environment,
  bucketName,
  branchName,
}: EnvironmentActionParams) {
  await deleteObjectsByPrefix(bucketName, environment)
  await deleteDeployments(environment, branchName)
  await deleteRoute53Record({
    domainName: getDomainName(),
    recordName: `${environment}.${domainName}`,
  })
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const { action } = context.payload
    const pullRequest = context.payload.pull_request
    if (!pullRequest) {
      throw new Error(
        "This action can only be run on pull requests. Exiting...",
      )
    }

    const appName = getAppName()
    const domainName = getDomainName()
    const pullRequestNumber = pullRequest.number
    const environment = pullRequestNumber
      ? `preview-${pullRequestNumber}`
      : "preview"
    const bucketName = `${appName}-preview-deployment`
    const branchName = pullRequest.head.ref

    const params = {
      appName,
      domainName,
      environment,
      bucketName,
      branchName,
      pullRequestNumber,
    }

    console.log("Running action with params", params)

    switch (action) {
      case "opened":
      case "reopened":
      case "synchronize":
        await createPreviewEnvironment(params)
        break
      case "closed":
        await deletePreviewEnvironment(params)
        break
      default:
        throw new Error(`${action} is not implemented...`)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
