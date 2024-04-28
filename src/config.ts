import { getInput } from "@actions/core"

export const getAppName = () =>
  getInput("app-name") || (process.env.APP_NAME as string)
export const getBuidDir = () =>
  getInput("build-dir") || (process.env.BUILD_DIR as string)
export const getDomainName = () =>
  getInput("domain") || (process.env.DOMAIN as string)

export const getGithubToken = () => process.env.GITHUB_TOKEN as string

export const getSubDomain = () => getInput("subdomain") || "preview"

export const aws = {
  region: process.env.AWS_REGION as string,
  accountId: process.env.AWS_ACCOUNT_ID as string,
  cloudfrontCertificateArn: process.env
    .AWS_CLOUDFRONT_CERTIFICATE_ARN as string,
}
