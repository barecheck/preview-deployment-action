import {
  CloudFrontClient,
  GetDistributionCommand,
  CreateDistributionCommand,
  // UpdateDistributionCommand,
  ListDistributionsCommand,
  ListOriginAccessControlsCommand,
  CreateOriginAccessControlCommand,
  CreateFunctionCommand,
  UpdateFunctionCommand,
  PublishFunctionCommand,
  ListFunctionsCommand,
  GetFunctionCommand,
  ViewerProtocolPolicy,
  Method,
  GeoRestrictionType,
  PriceClass,
  HttpVersion,
  MinimumProtocolVersion,
  CertificateSource,
  SSLSupportMethod,
  OriginAccessControlSigningProtocols,
  OriginAccessControlSigningBehaviors,
  OriginAccessControlOriginTypes,
  FunctionRuntime,
  EventType,
} from "@aws-sdk/client-cloudfront"
import { readFileSync } from "fs"

import { appName, domainName } from "../config"
import path from "path"

const client = new CloudFrontClient()

function getDefaultDistributionInput(
  originId: string,
  originAccessControlId: string,
  cloudfrontFunctionArn: string,
) {
  const defaultDistributionInput = {
    DistributionConfig: {
      CallerReference: appName,
      Aliases: {
        Quantity: Number(0),
      },
      Origins: {
        Quantity: Number(1),
        Items: [
          {
            Id: originId,
            DomainName: originId,
            OriginPath: "",
            OriginShield: {
              Enabled: false,
            },
            OriginAccessControlId: originAccessControlId,
            S3OriginConfig: {
              OriginAccessIdentity: "",
            },
            CustomHeaders: {
              Quantity: Number(0),
            },
            connectionTimeout: 10,
            connectionAttempts: 3,
          },
        ],
      },
      CacheBehaviors: {
        Quantity: Number(0),
      },
      CustomErrorResponses: {
        Quantity: Number(0),
      },
      DefaultCacheBehavior: {
        TargetOriginId: originId,
        Compress: false,
        CachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad", // CachingDisabled
        ViewerProtocolPolicy: ViewerProtocolPolicy.redirect_to_https,
        LambdaFunctionAssociations: {
          Quantity: Number(0),
          Items: [],
        },
        FunctionAssociations: {
          Quantity: Number(1),
          Items: [
            {
              FunctionARN: cloudfrontFunctionArn,
              EventType: EventType.viewer_request,
            },
          ],
        },
        AllowedMethods: {
          Quantity: Number(7),
          Items: [
            Method.GET,
            Method.HEAD,
            Method.POST,
            Method.PUT,
            Method.PATCH,
            Method.OPTIONS,
            Method.DELETE,
          ],
          CachedMethods: {
            Quantity: Number(2),
            Items: [Method.GET, Method.HEAD],
          },
        },
        FieldLevelEncryptionId: "",
        SmoothStreaming: false,
      },
      Comment: "",
      Enabled: true,
      HttpVersion: HttpVersion.http2,
      IsIPV6Enabled: true,
      Staging: false,
      PriceClass: PriceClass.PriceClass_All,
      Logging: {
        Enabled: false,
        IncludeCookies: false,
        Bucket: "",
        Prefix: "",
      },
      DefaultRootObject: "index.html",
      WebACLId: "",
      Restrictions: {
        GeoRestriction: {
          RestrictionType: GeoRestrictionType.none,
          Quantity: Number(0),
        },
      },
      ViewerCertificate: {
        CloudFrontDefaultCertificate: false,
        // TODO: Find a way to create the certificate
        // As of now, the certificate is created manually and pased with other parameters
        ACMCertificateArn:
          "arn:aws:acm:us-east-1:483206745547:certificate/d77981ea-4463-49ee-9853-bb8ef3114b1c",
        CertificateSource: CertificateSource.acm,
        SSLSupportMethod: SSLSupportMethod.sni_only,
        MinimumProtocolVersion: MinimumProtocolVersion.TLSv1_2016,
      },
      AlternateDomainNames: {
        Quantity: Number(1),
        Items: [`*.${domainName}`],
      },
    },
  }
  return defaultDistributionInput
}

export async function getCloudfrontByOrigin(originId: string) {
  const distributions = await client.send(new ListDistributionsCommand())

  const distributionId = distributions.DistributionList?.Items?.find(
    (item) => item.Origins?.Items?.[0]?.DomainName === originId,
  )?.Id

  if (!distributionId) return

  const distribution = await client.send(
    new GetDistributionCommand({ Id: distributionId }),
  )

  return distribution
}

async function getOriginAccessControl(originId: string) {
  const originAccessControls = await client.send(
    new ListOriginAccessControlsCommand(),
  )

  const originAccessControl =
    originAccessControls.OriginAccessControlList?.Items?.find(
      (item) => item.Name === originId,
    )

  if (!originAccessControl) {
    const originAccessControlParams = {
      OriginAccessControlConfig: {
        Name: originId,
        Description: "Origin Access Control for Barecheck Preview Deployments",
        SigningProtocol: OriginAccessControlSigningProtocols.sigv4,
        SigningBehavior: OriginAccessControlSigningBehaviors.always,
        OriginAccessControlOriginType: OriginAccessControlOriginTypes.s3,
      },
    }
    const originAccessControlData = await client.send(
      new CreateOriginAccessControlCommand(originAccessControlParams),
    )
    const originAccessControlId =
      originAccessControlData?.OriginAccessControl?.Id || ""

    console.log("Created Origin Access Control:", originAccessControlId)
    return originAccessControlId
  }
  const originAccessControlId = originAccessControl.Id || ""
  console.log("Origin Access Control:", originAccessControlId)

  return originAccessControlId
}

async function getCloudfrontFunc(functionName: string) {
  const functions = await client.send(new ListFunctionsCommand())

  const cloudfrontFunction = functions.FunctionList?.Items?.find(
    (item) => item.Name === functionName,
  )

  if (!cloudfrontFunction) return

  const func = await client.send(new GetFunctionCommand({ Name: functionName }))

  return {
    arn: cloudfrontFunction?.FunctionMetadata?.FunctionARN,
    version: func.ETag,
  }
}

async function publishCloudfrontFunction(
  functionName: string,
  version: string,
) {
  const publishFunctionParams = {
    IfMatch: version,
    Name: functionName,
  }
  const res = await client.send(
    new PublishFunctionCommand(publishFunctionParams),
  )

  const publishedArn = res.FunctionSummary?.FunctionMetadata?.FunctionARN

  console.log("Published Cloudfront Function:", functionName)

  return publishedArn || ""
}

async function createCloudfrontFunction() {
  const functionName = `${appName}PreviewDeploymentFunction`

  const cloudfrontFunc = await getCloudfrontFunc(functionName)

  const cloudfrontFuncPath = path.join(__dirname, "cloudfront-function.js")
  const functionCode = readFileSync(cloudfrontFuncPath)
  const functionParams = {
    Name: functionName,
    FunctionConfig: {
      Comment: `Function for ${appName} Preview Deployments`,
      Runtime: FunctionRuntime.cloudfront_js_2_0,
      KeyValueStoreAssociations: {
        Quantity: Number(0),
      },
    },
    FunctionCode: functionCode,
  }

  if (!cloudfrontFunc) {
    const functionData = await client.send(
      new CreateFunctionCommand(functionParams),
    )
    const createdFunctionArn =
      functionData?.FunctionSummary?.FunctionMetadata?.FunctionARN

    if (!createdFunctionArn)
      throw new Error("Couldn't create Cloudfront function")

    console.log("Created Cloudfront Function:", functionName)
    const publishedArn = await publishCloudfrontFunction(
      functionName,
      functionData.ETag || "",
    )
    return publishedArn
  } else {
    console.log("Cloudfront Function already exists")
    const res = await client.send(
      new UpdateFunctionCommand({
        Name: functionName,
        IfMatch: cloudfrontFunc.version,
        FunctionConfig: functionParams.FunctionConfig,
        FunctionCode: functionParams.FunctionCode,
      }),
    )
    console.log("Updated Cloudfront Function:", functionName)

    const publishedArn = await publishCloudfrontFunction(
      functionName,
      res.ETag || "",
    )

    return publishedArn
  }
}

export async function createCloudfront(originId: string) {
  const distributionFound = await getCloudfrontByOrigin(originId)
  const originAccessControlId = await getOriginAccessControl(originId)
  const cloudfrontFunctionArn = await createCloudfrontFunction()

  const distributionInput = getDefaultDistributionInput(
    originId,
    originAccessControlId,
    cloudfrontFunctionArn,
  )

  let distribution

  if (!distributionFound) {
    const command = new CreateDistributionCommand(distributionInput)
    const res = await client.send(command)
    distribution = res.Distribution
  } else {
    console.log("Updating Cloudfront Distribution", {
      id: distributionFound.Distribution?.Id,
      eTag: distributionFound.ETag,
    })
    // TODO: Ability to update Cloudfront distribution
    // const command = new UpdateDistributionCommand({
    //   Id: distributionFound?.Distribution?.Id,
    //   IfMatch: distributionFound?.ETag,
    //   DistributionConfig: distributionInput.DistributionConfig,
    // })
    // const res = await client.send(command)
    distribution = distributionFound?.Distribution
  }

  if (!distribution || !distribution.Id || !distribution.DomainName)
    throw new Error("Cloudfront distribution doesn't exist")

  return {
    id: distribution.Id,
    domainName: distribution.DomainName,
  }
}
