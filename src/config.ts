import { getInput } from "@actions/core"

export const getAppName = () => getInput("app-name")
export const getBuidDir = () => getInput("build-dir")
export const getDomainName = () => getInput("domain")

export const aws = {
  region: process.env.AWS_REGION as string,
  accountId: process.env.AWS_ACCOUNT_ID as string,
  cloudfrontCertificateArn: process.env
    .AWS_CLOUDFRONT_CERTIFICATE_ARN as string,
}
