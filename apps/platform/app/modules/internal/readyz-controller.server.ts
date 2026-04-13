export class ReadyzController {
  getStatus(): Response {
    return new Response("ok", {
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }
}
