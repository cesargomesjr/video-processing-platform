FROM node:24.11.1-alpine AS build

WORKDIR /workspace

COPY package.json package-lock.json tsconfig.json ./
COPY apps/api/tsconfig.json apps/api/tsconfig.build.json ./apps/api/
RUN npm ci --ignore-scripts

COPY apps/api/src ./apps/api/src
RUN npm run build

FROM node:24.11.1-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /workspace/dist/apps/api ./dist

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:3000/health/ready || exit 1

CMD ["node", "dist/main/bootstrap.js"]
