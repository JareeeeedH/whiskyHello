/**
 * Resolve a post-login path from the `redirect` query.
 * Only same-app relative paths are allowed (blocks open redirects).
 */
export function resolvePostLoginPath(redirect: unknown): string {
  if (typeof redirect !== 'string') {
    return '/'
  }

  const value = redirect.trim()
  if (!value) {
    return '/'
  }

  // Must be an in-app path: "/profile", "/whiskies/1?x=1"
  // Reject protocol-relative "//evil.com" and absolute URLs.
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('://')) {
    return '/'
  }

  return value
}
