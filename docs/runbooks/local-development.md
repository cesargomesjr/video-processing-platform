# Runbook — Desenvolvimento Local

## Dependências

- Node.js 24;
- npm 11;
- Docker e Docker Compose;
- Git.

PostgreSQL e Firebase Authentication Emulator fazem parte do EPIC-002. RabbitMQ e MinIO entram no EPIC-003.

## Preparação

```bash
cp .env.example .env
npm ci
```

O lifecycle `prepare` configura automaticamente `.githooks` como o diretório de hooks deste clone. Para reinstalar manualmente:

```bash
npm run hooks:install
```

## Executar via Docker Compose

```bash
npm run compose:up
curl --fail http://localhost:3000/health/live
curl --fail http://localhost:3000/health/ready
npm run compose:down
```

Para mudar apenas a porta publicada no host:

```bash
API_HOST_PORT=8080 npm run compose:up
```

## Executar diretamente

Suba PostgreSQL e Firebase Authentication Emulator antes da API e exporte as variáveis de `.env.example`.

```bash
npm run build
npm start
curl --fail http://localhost:3000/health/live
```

## Exercitar autenticação local

Crie uma conta email/senha no Authentication Emulator:

```bash
curl --request POST \
  'http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key' \
  --header 'Content-Type: application/json' \
  --data '{
    "email": "user@example.com",
    "password": "local-password",
    "returnSecureToken": true
  }'
```

Copie o campo `idToken` da resposta e use-o para provisionar a identidade local:

```bash
curl --request PUT \
  http://localhost:3000/auth/me \
  --header "Authorization: Bearer <idToken>"
```

A API persiste somente `id`, `firebase_uid`, email, confirmação do email e timestamps. A senha e o ID Token não são persistidos.

## Produção

- não configure `FIREBASE_AUTH_EMULATOR_HOST`;
- configure `FIREBASE_PROJECT_ID`;
- configure `DATABASE_URL`;
- forneça credenciais Firebase via Application Default Credentials;
- não versione arquivos JSON de service account.

## Verificação

```bash
npm run verify
```

Esse comando executa formatação, lint, regras arquiteturais, typecheck, testes, cobertura e build.

## Variáveis

- `NODE_ENV`: `development`, `test` ou `production`;
- `APP_PORT`: porta usada pelo processo Node;
- `API_HOST_PORT`: porta publicada pelo Compose;
- `DATABASE_URL`: conexão PostgreSQL;
- `DATABASE_POOL_MAX`: máximo de conexões no pool;
- `FIREBASE_PROJECT_ID`: projeto Firebase esperado pelo validador;
- `FIREBASE_AUTH_EMULATOR_HOST`: host sem protocolo, somente para desenvolvimento/testes;
- `FIREBASE_AUTH_HOST_PORT`: porta do Authentication Emulator publicada no host;
