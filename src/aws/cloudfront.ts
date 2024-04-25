import {
  CloudFrontClient,
  CreateDistributionCommand,
  ListDistributionsCommand,
  ListOriginAccessControlsCommand,
  CreateOriginAccessControlCommand,
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
} from "@aws-sdk/client-cloudfront"

import { appName, domainName } from "../config"

const client = new CloudFrontClient()

function getDefaultDistributionInput(
  originId: string,
  originAccessControlId: string,
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
      DefaultRootObject: "",
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

  const distribution = distributions.DistributionList?.Items?.find(
    (item) => item.Origins?.Items?.[0]?.DomainName === originId,
  )

  return distribution
}

async function getOriginAccessControl(originId: string) {
  const originAccessControls = await client.send(
    new ListOriginAccessControlsCommand(),
  )

  const names = originAccessControls.OriginAccessControlList?.Items?.map(
    (item) => item.Name,
  )
  console.log("Origin Access Controls:", names)

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

export async function createCloudfront(originId: string) {
  const distribution = await getCloudfrontByOrigin(originId)
  console.log("Cloudfront Exists:", distribution?.Id)

  if (!distribution || !distribution.Id || !distribution.DomainName) {
    const originAccessControlId = await getOriginAccessControl(originId)

    const distributionInput = getDefaultDistributionInput(
      originId,
      originAccessControlId,
    )

    const command = new CreateDistributionCommand(distributionInput)
    const res = await client.send(command)
    const createdDistribution = res.Distribution
    if (
      !createdDistribution ||
      !createdDistribution.Id ||
      !createdDistribution.DomainName
    )
      throw new Error("Cloudfront distribution not created")

    console.log("Cloudfront created:", createdDistribution.Id)

    return {
      id: createdDistribution.Id,
      domainName: createdDistribution.DomainName,
    }
  }

  return {
    id: distribution.Id,
    domainName: distribution.DomainName,
  }
}
