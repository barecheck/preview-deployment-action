import "dotenv/config"
import { createCloudfront } from "./aws/cloudfront"
import { setupS3Bucket, updateBucketPolicy, syncFiles } from "./aws/s3"
import { createRoute53Record } from "./aws/route53"
import { appName, domainName } from "./config"

async function createInfra() {
  const bucketName = `${appName}-preview-deployment`
  const originId = `${bucketName}.s3.us-east-1.amazonaws.com`
  // Subdomain should be PR ID + preview
  const subDomain = "preview"

  await setupS3Bucket(bucketName)
  const cloudfront = await createCloudfront(originId)

  await updateBucketPolicy(bucketName, cloudfront.id)

  // Domain should be fetched from settings
  // recordName should be branchName
  await createRoute53Record({
    domainName,
    recordName: `${subDomain}.${domainName}`,
    routeTrafficTo: cloudfront.domainName,
  })

  await syncFiles({
    bucketName,
    prefix: subDomain,
    directory: "example",
  })
}

createInfra()
