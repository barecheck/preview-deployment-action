import 'dotenv/config'
import { createCloudfront } from './aws/cloudfront'
import { setupS3Bucket, updateBucketPolicy } from './aws/s3'
import { appName } from './config'

async function createInfra() {
  const bucketName = `${appName}-preview-deployment`
  const originId = `${bucketName}.s3.us-east-1.amazonaws.com`

  await setupS3Bucket(bucketName)
  const distributionId = await createCloudfront(originId)
  await updateBucketPolicy(bucketName, distributionId)
}

createInfra()
