ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS build
ARG VITE_BASE_PATH=/portfolio/
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci

COPY frontend ./frontend
RUN VITE_BASE_PATH="$VITE_BASE_PATH" npm run build --workspace frontend

FROM node:${NODE_VERSION}-bookworm-slim AS production-dependencies
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --omit=dev

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001
WORKDIR /app

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./package.json
COPY --chown=node:node backend/package.json backend/package.json
COPY --chown=node:node backend/src backend/src
COPY --chown=node:node backend/scripts backend/scripts
COPY --chown=node:node backend/migrations backend/migrations
COPY --chown=node:node backend/schema.sql backend/schema.sql
COPY --chown=node:node backend/data/seed.js backend/data/seed.js
COPY --from=build --chown=node:node /app/frontend/dist frontend/dist

USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3001/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["node", "backend/src/server.js"]
