// Version 1.0.1
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handler(event) {
  const request = event.request
  const host = request.headers.host.value
  console.log("host")
  console.log(host)
  const subDomain = host.split(".")[0]
  console.log("subDomain")
  console.log(subDomain)

  const uri = request.uri
  console.log("uri")
  console.log(uri)

  // Check whether the URI is missing a file name.
  if (uri.endsWith("/")) {
    request.uri = `/${subDomain}${uri}index.html`
  }
  // Check whether the URI is missing a file extension.
  else if (!uri.includes(".")) {
    request.uri = `/${subDomain}${uri}`
  }

  console.log("request.uri")
  console.log(request.uri)

  return request
}
