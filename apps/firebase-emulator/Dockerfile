FROM node:24.11.1-bookworm-slim

ARG FIREBASE_TOOLS_VERSION=15.31.0

RUN apt-get update && apt-get install --yes --no-install-recommends default-jre-headless && npm install --global "firebase-tools@${FIREBASE_TOOLS_VERSION}" && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV FIREBASE_TOOLS_DISABLE_UPDATE_CHECK=true
ENV XDG_CONFIG_HOME=/tmp/.config
WORKDIR /workspace

COPY firebase.json .firebaserc ./

WORKDIR /tmp
EXPOSE 9099

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=6 CMD ["node", "-e", "fetch('http://127.0.0.1:9099').then(() => process.exit(0)).catch(() => process.exit(1))"]

CMD ["firebase", "emulators:start", "--only", "auth", "--project", "demo-fiapx", "--config", "/workspace/firebase.json"]
