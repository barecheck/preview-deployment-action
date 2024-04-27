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

async function checkIfDeploymentExists(branchName: string) {
  const octokit = getGithubClient()

  const owner = context.repo.owner
  const repo = context.repo.repo

  const { data } = await octokit.rest.repos.listDeployments({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
  })

  console.log("Deployments:", data)

  return data
}

/**
 * Creates a deployment for the current branch.
 */
async function createDeployment(branchName: string) {
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
    environment: "preview", // TODO: Make this configurable
  })

  if (!data || !("id" in data)) {
    throw new Error("Failed to create deployment")
  }

  return data.id
}

/**
 * Updates the deployment status.
 */
export async function updateDeploymentStatus(
  deploymentId: number,
  status: DeploymentStatus,
  previewUrl: string,
) {
  const octokit = getGithubClient()

  const owner = context.repo.owner
  const repo = context.repo.repo

  await octokit.rest.repos.createDeploymentStatus({
    owner,
    repo,
    deployment_id: deploymentId,
    state: status,
    environment_url: previewUrl,
  })
}

export async function startDeployment(previewUrl: string) {
  const branchName = context.payload.pull_request?.head.ref

  if (!branchName) {
    console.log(
      "No branch name found in the payload. Skipping deployment creation.",
    )
    return
  }

  const currentDeployment = await checkIfDeploymentExists(branchName)

  if (currentDeployment.length > 0) {
    console.log("Deployment already exists for this branch")
    return
  }

  const createdDeploymentId = await createDeployment(branchName)
  await updateDeploymentStatus(createdDeploymentId, "in_progress", previewUrl)

  return createdDeploymentId
}
