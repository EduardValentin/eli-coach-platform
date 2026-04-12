export class ReadyzController {
  handle(): Response {
    return new Response("ok", {
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }
}
