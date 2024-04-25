import {
  S3Client,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  ListBucketsCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import path from "path"
import readdir from "recursive-readdir"
import mimeTypes from "mime-types"
import { readFileSync } from "fs"

import { aws } from "../config"

const client = new S3Client({ region: aws.region })

export async function updateBucketPolicy(
  bucketName: string,
  distributionId: string,
) {
  const policy = {
    Version: "2008-10-17",
    Id: "PolicyForCloudFrontPrivateContent",
    Statement: [
      {
        Sid: "AllowCloudFrontServicePrincipal",
        Effect: "Allow",
        Principal: {
          Service: "cloudfront.amazonaws.com",
        },
        Action: "s3:GetObject",
        Resource: `arn:aws:s3:::${bucketName}/*`,
        Condition: {
          StringEquals: {
            "AWS:SourceArn": `arn:aws:cloudfront::${aws.accountId}:distribution/${distributionId}`,
          },
        },
      },
    ],
  }
  const params = {
    Bucket: bucketName,
    Policy: JSON.stringify(policy),
  }

  const res = await client.send(new PutBucketPolicyCommand(params))
  console.log("Bucket Policy Updated:", {
    bucketName,
    distributionId,
  })
  return res
}

async function isBucketExists(bucketName: string) {
  const data = await client.send(new ListBucketsCommand({}))
  const bucket = data.Buckets?.find(({ Name }) => Name === bucketName)
  return bucket
}

async function createS3Bucket(bucketName: string) {
  const params = {
    Bucket: bucketName,
    blockPublicAccess: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
  }

  const data = await client.send(new CreateBucketCommand(params))
  console.log("Bucket Created:", data.Location)

  return bucketName
}

export async function setupS3Bucket(bucketName: string) {
  const bucket = await isBucketExists(bucketName)
  if (bucket) {
    console.log("Bucket Exists:", bucketName)
  } else {
    await createS3Bucket(bucketName)
  }

  return bucketName
}

async function putObject(bucketName: string, key: string, filePath: string) {
  const mineType = mimeTypes.lookup(filePath) || "application/octet-stream"
  const fileBuffer = readFileSync(filePath)

  const params = {
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: mineType,
  }

  await client.send(new PutObjectCommand(params))
  console.log("Object Uploaded:", {
    bucketName,
    key,
    filePath,
  })
}

async function deleteObjects(bucketName: string, prefix: string) {
  const params = {
    Bucket: bucketName,
    Key: prefix,
  }
  await client.send(new DeleteObjectCommand(params))

  console.log("Objects Deleted:", { bucketName, prefix })
}

function filePathToS3Key(filePath: string) {
  return filePath.replace(/^(\\|\/)+/g, "").replace(/\\/g, "/")
}

type SyncFilesParams = {
  bucketName: string
  prefix: string
  directory: string
}

export async function syncFiles({
  bucketName,
  prefix,
  directory,
}: SyncFilesParams) {
  await deleteObjects(bucketName, prefix)

  const normalizedPath = path.normalize(directory)
  const files = await readdir(normalizedPath)

  const uploadedObjects = await Promise.all(
    files.map(async (filePath) => {
      const relativeFilepath = filePath.replace(normalizedPath, "")
      const s3Key = `${prefix}/${filePathToS3Key(relativeFilepath)}`

      console.log(`Uploading ${s3Key} to ${bucketName}`)

      const object = await putObject(bucketName, s3Key, filePath)
      return object
    }),
  )

  return uploadedObjects
}
