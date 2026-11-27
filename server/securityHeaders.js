const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  // Canvas Confetti runs its animation in a worker created from a blob URL.
  "worker-src 'self' blob:",
].join("; ")

export function securityHeaders({ isProduction }) {
  return (_request, response, next) => {
    response.setHeader("Content-Security-Policy", CONTENT_SECURITY_POLICY)
    response.setHeader("X-Content-Type-Options", "nosniff")
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")
    response.setHeader("X-Frame-Options", "DENY")
    if (isProduction) {
      response.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains")
    }
    next()
  }
}
