# syntax=docker/dockerfile:1

# ---- Build stage: install production dependencies only ----
# Base images are pinned by digest so every build uses exactly the same bits.
# To update: docker pull <image:tag>, then copy the new digest here.
FROM node:22-bookworm-slim@sha256:4b150b48b4116e2a22f2c39cc27025fbf4f153e2078fd3b14d159fdb5c7279da AS build

WORKDIR /app
ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

# Install from the lockfile only; --ignore-scripts stops dependency install scripts from running.
# Behind a TLS-inspecting proxy, pass its CA as a build secret (never stored in the image):
#   docker build --secret id=ca,src=/path/to/proxy-ca.crt .
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=secret,id=ca,required=false \
    if [ -f /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi \
 && npm ci --omit=dev --ignore-scripts \
 && npm cache clean --force

COPY server.js ./
COPY public ./public

# Writable folders for card data and uploads, owned by the distroless "nonroot" user (65532)
RUN mkdir -p data uploads


# ---- Runtime stage: distroless Node, no shell, no package manager, non-root ----
FROM gcr.io/distroless/nodejs22-debian12:nonroot@sha256:13593b7570658e8477de39e2f4a1dd25db2f836d68a0ba771251572d23bb4f8e

LABEL org.opencontainers.image.title="heartfelt" \
      org.opencontainers.image.description="Send love, congrats and celebration cards with photo, video, text or voice" \
      org.opencontainers.image.source="https://github.com/Thinhlegit/heartfelt" \
      org.opencontainers.image.licenses="ISC"

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# App code is owned by root and read-only to the app user; only data/ and uploads/ are writable
COPY --from=build --chown=0:0 /app/node_modules ./node_modules
COPY --from=build --chown=0:0 /app/package.json /app/server.js ./
COPY --from=build --chown=0:0 /app/public ./public
# Ownership must be set here: COPY --from resets files to root otherwise
COPY --from=build --chown=65532:65532 --chmod=700 /app/data ./data
COPY --from=build --chown=65532:65532 --chmod=700 /app/uploads ./uploads

USER 65532:65532
EXPOSE 3000
VOLUME ["/app/data", "/app/uploads"]

# No curl in distroless, so the health check uses Node's built-in fetch
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

# The distroless entrypoint is node itself; server.js handles SIGTERM for clean shutdowns
CMD ["server.js"]
