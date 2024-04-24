import {
  S3Client,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  ListBucketsCommand
} from '@aws-sdk/client-s3'
import { aws } from '../config'

const client = new S3Client({ region: aws.region })

export async function updateBucketPolicy(
  bucketName: string,
  distributionId: string
) {
  const policy = {
    Version: '2008-10-17',
    Id: 'PolicyForCloudFrontPrivateContent',
    Statement: [
      {
        Sid: 'AllowCloudFrontServicePrincipal',
        Effect: 'Allow',
        Principal: {
          Service: 'cloudfront.amazonaws.com'
        },
        Action: 's3:GetObject',
        Resource: `arn:aws:s3:::${bucketName}/*`,
        Condition: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${aws.accountId}:distribution/${distributionId}`
          }
        }
      }
    ]
  }
  const params = {
    Bucket: bucketName,
    Policy: JSON.stringify(policy)
  }

  const res = await client.send(new PutBucketPolicyCommand(params))
  console.log('Bucket Policy Updated:', {
    bucketName,
    distributionId
  })
  return res
}

async function isBucketExists(bucketName: string) {
  const data = await client.send(new ListBucketsCommand({}))
  const bucket = data.Buckets?.find(bucket => bucket.Name === bucketName)
  return bucket
}

async function createS3Bucket(bucketName: string) {
  const params = {
    Bucket: bucketName,
    blockPublicAccess: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true
    }
  }

  const data = await client.send(new CreateBucketCommand(params))
  console.log('Bucket Created:', data.Location)

  return bucketName
}

export async function setupS3Bucket(bucketName: string) {
  const bucket = await isBucketExists(bucketName)
  if (bucket) {
    console.log('Bucket Exists:', bucketName)
  } else {
    await createS3Bucket(bucketName)
  }

  return bucketName
}
