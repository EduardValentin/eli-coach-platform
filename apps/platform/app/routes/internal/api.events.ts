export function loader() {
  return new Response(`event: ready\ndata: ${JSON.stringify({ status: "ok" })}\n\n`, {
    headers: {
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "content-type": "text/event-stream",
    },
  });
}
