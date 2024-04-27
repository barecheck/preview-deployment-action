import { getOctokit, context } from "@actions/github"

type DeploymentStatus =
  | "success"
  | "failure"
  | "in_progress"
  | "queued"
  | "pending"

function getGithubClient() {
  return getOctokit(process.env.GITHUB_TOKEN as string)
}

async function listDeployments(branchName: string, environment: string) {
  const octokit = getGithubClient()

  const owner = context.repo.owner
  const repo = context.repo.repo

  const { data } = await octokit.rest.repos.listDeployments({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    environment,
  })

  return data
}

/**
 * Creates a deployment for the current branch.
 */
async function createDeployment(branchName: string, environment: string) {
  const octokit = getGithubClient()

  const owner = context.repo.owner
  const repo = context.repo.repo

  const { data } = await octokit.rest.repos.createDeployment({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    auto_merge: true,
    transient_environment: true,
    required_contexts: [], // no checks required
    environment,
  })

  if (!data || !("id" in data)) {
    throw new Error("Failed to create deployment")
  }

  return data.id
}

type UpdateDeploymentStatupParams = {
  deploymentId: number
  status: DeploymentStatus
  previewUrl?: string | undefined
  environment: string
}

/**
 * Updates the deployment status.
 */
export async function updateDeploymentStatus({
  deploymentId,
  status,
  previewUrl,
  environment,
}: UpdateDeploymentStatupParams) {
  const octokit = getGithubClient()

  const owner = context.repo.owner
  const repo = context.repo.repo

  await octokit.rest.repos.createDeploymentStatus({
    owner,
    repo,
    deployment_id: deploymentId,
    state: status,
    environment_url: previewUrl,
    environment,
  })
}

/*
 * Starts the deployment process.
 * If a deployment already exists for the branch, it will be used.
 * Otherwise, a new deployment will be created.
 */
export async function startDeployment(environment: string, branchName: string) {
  let deploymentId: number
  const currentDeployments = await listDeployments(branchName, environment)

  if (currentDeployments.length > 0) {
    console.log("Deployment already exists for this branch")
    deploymentId = currentDeployments[0].id
  } else {
    deploymentId = await createDeployment(branchName, environment)
  }

  await updateDeploymentStatus({
    deploymentId,
    status: "in_progress",
    environment,
  })

  return deploymentId
}

export async function deleteDeployments(
  environment: string,
  branchName: string,
) {
  const deployments = await listDeployments(branchName, environment)

  await Promise.all(
    deployments.map(async (deployment) => {
      const octokit = getGithubClient()

      const owner = context.repo.owner
      const repo = context.repo.repo

      await octokit.rest.repos.deleteDeployment({
        owner,
        repo,
        deployment_id: deployment.id,
      })
    }),
  )
}
