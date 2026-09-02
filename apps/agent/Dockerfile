# Build context is the MONOREPO ROOT (not apps/agent), because this package
# is part of a pnpm workspace and needs the root lockfile to install
# correctly. On Railway: set "Root Directory" to the repo root and
# "Dockerfile Path" to apps/agent/Dockerfile.
#
#   docker build -f apps/agent/Dockerfile -t agent .
#
FROM node:22-slim AS deps
WORKDIR /repo
RUN npm install -g pnpm@10
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/agent/package.json apps/agent/package.json
RUN pnpm install --filter @photodecaffeine/agent... --frozen-lockfile

FROM deps AS build
COPY apps/agent apps/agent
RUN pnpm --filter @photodecaffeine/agent build

FROM node:22-slim AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/agent/node_modules ./apps/agent/node_modules
COPY --from=build /repo/apps/agent/dist ./apps/agent/dist
COPY --from=build /repo/apps/agent/package.json ./apps/agent/package.json
EXPOSE 8787
CMD ["node", "apps/agent/dist/server.js"]
