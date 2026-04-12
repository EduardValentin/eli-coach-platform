import { healthStatusSchema } from "@eli-coach-platform/contracts";

const textEventStreamHeaders = {
  "cache-control": "no-cache, no-transform",
  connection: "keep-alive",
  "content-type": "text/event-stream",
} as const;

export class ApiEventsController {
  getEventStream(): Response {
    const eventPayload = healthStatusSchema.parse({
      status: "ok",
      timestamp: new Date().toISOString(),
    });

    return new Response(`event: ready\ndata: ${JSON.stringify(eventPayload)}\n\n`, {
      headers: textEventStreamHeaders,
    });
  }
}
