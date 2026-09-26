# Runbook — Desenvolvimento Local

## Dependências

- Node.js 24;
- npm 11;
- Docker e Docker Compose;
- Git.

O ambiente local sobe PostgreSQL, Firebase Authentication Emulator, MinIO, RabbitMQ e API via Docker Compose.

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
```

Servicos publicados por padrao: API `http://localhost:3000`, Firebase Authentication Emulator `http://localhost:9099`, MinIO S3 API `http://localhost:9000`, MinIO Console `http://localhost:9001`, RabbitMQ AMQP `localhost:5672` e RabbitMQ Management `http://localhost:15672`.

Para mudar apenas a porta publicada no host:

```bash
API_HOST_PORT=8080 npm run compose:up
```

Para encerrar:

```bash
npm run compose:down
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
  "http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key" \
  --header "Content-Type: application/json" \
  --data "{\"email\":\"user@example.com\",\"password\":\"local-password\",\"returnSecureToken\":true}"
```

Copie o campo `idToken` da resposta e use-o para provisionar a identidade local:

```bash
curl --request PUT \
  http://localhost:3000/auth/me \
  --header "Authorization: Bearer <idToken>"
```

A API persiste somente `id`, `firebase_uid`, email, confirmacao do email e timestamps. A senha e o ID Token nao sao persistidos.

## Exercitar upload de video local

Crie a intencao de upload usando o token do emulador:

```bash
curl --request POST \
  http://localhost:3000/videos \
  --header "Authorization: Bearer <idToken>" \
  --header "Content-Type: application/json" \
  --data '{"filename":"sample.mp4","contentType":"video/mp4","sizeBytes":12}'
```

Envie o arquivo diretamente para a URL assinada retornada pela API:

```bash
curl --request PUT \
  "<upload.url>" \
  --header "content-type: video/mp4" \
  --data-binary "@sample.mp4"
```

Confirme o upload, consulte o detalhe e liste os videos do usuario:

```bash
curl --request POST \
  http://localhost:3000/videos/<videoId>/upload-completed \
  --header "Authorization: Bearer <idToken>"

curl --request GET \
  http://localhost:3000/videos/<videoId> \
  --header "Authorization: Bearer <idToken>"

curl --request GET \
  "http://localhost:3000/videos?limit=20" \
  --header "Authorization: Bearer <idToken>"
```

Nao registre tokens, headers `Authorization` ou URLs assinadas em logs/artefatos.

## Produção

- não configure `FIREBASE_AUTH_EMULATOR_HOST`;
- configure `FIREBASE_PROJECT_ID`;
- configure `DATABASE_URL`;
- configure `VIDEO_STORAGE_*` para um bucket S3 compativel privado;
- configure `MESSAGE_BROKER_URL` e `VIDEO_UPLOADED_EXCHANGE`;
- forneca credenciais Firebase via Application Default Credentials;
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
- `VIDEO_STORAGE_ENDPOINT`: endpoint S3 compativel;
- `VIDEO_STORAGE_REGION`: regiao usada pelo cliente S3;
- `VIDEO_STORAGE_BUCKET`: bucket privado dos videos originais;
- `VIDEO_STORAGE_ACCESS_KEY_ID`: access key do storage;
- `VIDEO_STORAGE_SECRET_ACCESS_KEY`: secret key do storage;
- `VIDEO_STORAGE_FORCE_PATH_STYLE`: habilita path-style para MinIO/local;
- `VIDEO_UPLOAD_TTL_SECONDS`: validade das URLs assinadas de upload;
- `VIDEO_UPLOAD_MAX_SIZE_BYTES`: tamanho maximo aceito por video;
- `MINIO_HOST_PORT`: porta S3 do MinIO publicada no host;
- `MINIO_CONSOLE_HOST_PORT`: porta do console MinIO publicada no host;
- `MESSAGE_BROKER_URL`: conexao AMQP;
- `MESSAGE_BROKER_HOST_PORT`: porta AMQP publicada no host;
- `RABBITMQ_MANAGEMENT_HOST_PORT`: porta do console RabbitMQ publicada no host;
- `VIDEO_UPLOADED_EXCHANGE`: exchange duravel para eventos `VideoUploaded`;
- `VIDEO_OUTBOX_POLL_INTERVAL_MS`: intervalo do dispatcher de outbox;
- `VIDEO_OUTBOX_BATCH_SIZE`: tamanho do lote de publicacao do outbox;
