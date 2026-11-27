import http.server
import os

BASE_PATH = os.environ.get("APP_BASE_PATH", "/").rstrip("/")
READY = os.environ["STUB_READY"] == "yes"
EDGE_STATUS = int(os.environ["STUB_EDGE_STATUS"])


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != BASE_PATH + "/readyz":
            self.send_response(404)
        elif not READY:
            self.send_response(503)
        elif "X-Forwarded-For" in self.headers:
            self.send_response(EDGE_STATUS)
        else:
            self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")

    def log_message(self, *_):
        pass


http.server.ThreadingHTTPServer(("0.0.0.0", 3000), Handler).serve_forever()
