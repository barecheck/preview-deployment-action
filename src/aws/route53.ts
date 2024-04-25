import {
  Route53Client,
  ListHostedZonesByNameCommand,
  ListResourceRecordSetsCommand,
  ChangeResourceRecordSetsCommand,
  ChangeAction,
  RRType,
} from "@aws-sdk/client-route-53"

import { appName } from "../config"

const client = new Route53Client()

async function findHostedZone(domainName: string) {
  const command = new ListHostedZonesByNameCommand({})
  const response = await client.send(command)
  const hostedZones = response.HostedZones
  const hostedZone = hostedZones?.find((zone) => zone.Name === `${domainName}.`)

  return hostedZone
}

async function findRoute53Record(zoneId: string, recordName: string) {
  const command = new ListResourceRecordSetsCommand({
    HostedZoneId: zoneId,
  })
  const response = await client.send(command)

  const record = response.ResourceRecordSets?.find(
    ({ Name }) => Name === recordName,
  )

  return record
}

type createRoute53RecordParams = {
  domainName: string
  recordName: string
  routeTrafficTo: string
}
export async function createRoute53Record({
  domainName,
  recordName,
  routeTrafficTo,
}: createRoute53RecordParams) {
  const hostedZone = await findHostedZone(domainName)
  if (!hostedZone || !hostedZone.Id) {
    throw new Error(`Hosted zone not found for ${domainName}`)
  }

  console.log("Hosted Zone:", hostedZone)

  const isRecordExists = await findRoute53Record(hostedZone.Id, recordName)

  if (isRecordExists) {
    console.log("Record already exists:", recordName)
    return
  }

  console.log("Creating record:", {
    hostedZoneId: hostedZone.Id,
    recordName,
    routeTrafficTo,
  })

  const recordParams = {
    ChangeBatch: {
      Changes: [
        {
          Action: ChangeAction.CREATE,
          ResourceRecordSet: {
            AliasTarget: {
              DNSName: routeTrafficTo,
              EvaluateTargetHealth: false,
              HostedZoneId: "Z2FDTNDATAQYW2", // CloudFront HostedZoneId
            },
            Name: recordName,
            Type: RRType.A,
            Ttl: 600,
          },
        },
      ],
      Comment: `Preview deployment record for ${appName}`,
    },
    HostedZoneId: hostedZone.Id,
  }

  await client.send(new ChangeResourceRecordSetsCommand(recordParams))
}
