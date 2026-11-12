/** Keep redirects on the host the browser actually used. */
export function sameOrigin(request: Request, pathAndQuery: string): URL {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) url.host = host;
  const [pathname, search = ""] = pathAndQuery.split("?");
  url.pathname = pathname;
  url.search = search ? `?${search}` : "";
  return url;
}
