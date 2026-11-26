FROM alpine:3.20@sha256:d9e853e87e55526f6b2917df91a2115c36dd7c696a35be12163d44e6e2a4b6bc

ARG RELEASE=0
LABEL sim.release=${RELEASE}

# deploy.sh only asks the container whether Postgres accepts connections.
RUN printf '#!/bin/sh\nexit 0\n' > /usr/local/bin/pg_isready && chmod +x /usr/local/bin/pg_isready

CMD ["sleep", "infinity"]
