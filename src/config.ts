export const appName = process.env.APP_NAME || 'barecheck'

export const aws = {
  region: process.env.AWS_REGION || 'us-east-1',
  accountId: process.env.AWS_ACCOUNT_ID as string
}
