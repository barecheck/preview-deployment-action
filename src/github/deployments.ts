import { getOctokit, context } from "@actions/github"

function getGithubClient() {
  return getOctokit(process.env.GITHUB_TOKEN as string)
}

export async function createDeployment() {
  const octokit = getGithubClient()

  const owner = context.repo.owner
  const repo = context.repo.repo
  const branchName = context.payload.pull_request?.head.ref

  if (!branchName) {
    console.log(
      "No branch name found in the payload. Skipping deployment creation.",
    )

    const res = await octokit.request(
      "POST /repos/{owner}/{repo}/deployments",
      {
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        auto_merge: true,
        dssdsa: "dsds",
      },
    )

    console.log("Created Deployment:", res.data)
  }
}
