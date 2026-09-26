# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY tsconfig.base.json tsconfig.base.json
COPY apps/worker/tsconfig.json apps/worker/tsconfig.json
COPY apps/worker/tsconfig.build.json apps/worker/tsconfig.build.json
COPY apps/worker/src apps/worker/src
COPY src src

RUN HUSKY=0 npm ci
RUN npm run build --workspace @fiapx/worker

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache ffmpeg

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/package.json ./apps/worker/package.json

USER node
CMD ["node", "apps/worker/dist/apps/worker/src/main.js"]
