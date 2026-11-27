FROM python:3.13-alpine@sha256:9ef1a599f863231c3d91e941389bfdc4a2d6070557243d54df1a4e57015b960e

# Distinguishes release images that are otherwise identical, so each has its own digest.
ARG RELEASE=0
# `no` makes the container fail its own health check.
ARG STUB_READY=yes
# The status /readyz returns to requests that came through Traefik.
ARG STUB_EDGE_STATUS=200

LABEL sim.release=${RELEASE}
ENV STUB_READY=${STUB_READY} STUB_EDGE_STATUS=${STUB_EDGE_STATUS}

COPY server.py /server.py

HEALTHCHECK --interval=2s --timeout=3s --retries=3 --start-period=1s \
  CMD ["python", "-c", "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:3000' + os.environ.get('APP_BASE_PATH', '/').rstrip('/') + '/readyz', timeout=2)"]

CMD ["python", "/server.py"]
