import serviceWorkerSource from "./sw.js?raw";

export function loader() {
  return new Response(serviceWorkerSource, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      // A service worker has to be re-fetched and byte-compared on every
      // registration check, or an installed worker can never see an update —
      // browsers already skip their HTTP cache for this file, but nothing
      // stops an intermediary from caching it anyway. "no-cache" still allows
      // a conditional revalidation; it only forbids serving a stored copy
      // without checking first.
      "cache-control": "no-cache",
    },
  });
}
