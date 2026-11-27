function isHandledRouteError(error) {
  return (
    error instanceof Error &&
    ["PlayerStateError", "RoundAlreadySubmittedError", "RoundForfeitedError"].includes(error.name) &&
    Number.isInteger(error.status)
  )
}

export function handleRouteError(error, response) {
  if (isHandledRouteError(error)) {
    response.status(error.status).json({ error: error.message })
    return
  }

  console.error(error)
  response.status(500).json({ error: "Unexpected server error." })
}

export function handleExpressError(error, _request, response, next) {
  if (response.headersSent) {
    next(error)
    return
  }

  if (error?.type === "entity.parse.failed") {
    response.status(400).json({ error: "Invalid JSON body." })
    return
  }

  if (error?.type === "entity.too.large") {
    response.status(413).json({ error: "Request body too large." })
    return
  }

  handleRouteError(error, response)
}
