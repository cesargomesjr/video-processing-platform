# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY tsconfig.base.json tsconfig.base.json
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/api/tsconfig.build.json apps/api/tsconfig.build.json
COPY apps/api/nest-cli.json apps/api/nest-cli.json
COPY apps/api/src apps/api/src
COPY src src

RUN HUSKY=0 npm ci
RUN npm run build --workspace @fiapx/api

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/apps/api/src/main.js"]
