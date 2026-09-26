# Contratos HTTP

## Conventions

Rotas protegidas recebem:

```http
Authorization: Bearer <firebase-id-token>
```

Requests podem enviar `X-Correlation-Id` como UUID. Valor ausente ou inválido é substituído por um UUID gerado pela API. A resposta devolve o correlation ID efetivo. Tokens, authorization headers e URLs assinadas não são registrados em logs.

Erros usam:

```json
{
  "code": "MACHINE_READABLE_CODE",
  "message": "Safe public message",
  "correlationId": "uuid"
}
```

## Authentication

Cadastro e login com email/senha são realizados pelo cliente no Firebase Authentication. A API não recebe senha e não emite token próprio.

Falhas de autenticação retornam `401`:

```json
{
  "code": "INVALID_IDENTITY_TOKEN",
  "message": "Invalid or expired identity token",
  "correlationId": "uuid"
}
```

## PUT /auth/me

Valida o Firebase ID Token e resolve/provisiona idempotentemente a identidade local.

Response `200`:

```json
{
  "id": "uuid",
  "firebaseUid": "firebase-uid",
  "email": "user@example.com",
  "emailVerified": false
}
```

## POST /videos

Cria um vídeo para o principal autenticado e retorna instruções temporárias de upload direto.

Request:

```json
{
  "filename": "sample.mp4",
  "contentType": "video/mp4",
  "sizeBytes": 104857600
}
```

Response `201`:

```json
{
  "id": "uuid",
  "filename": "sample.mp4",
  "contentType": "video/mp4",
  "sizeBytes": 104857600,
  "status": "AWAITING_UPLOAD",
  "progress": null,
  "createdAt": "ISO-8601",
  "upload": {
    "method": "PUT",
    "url": "https://signed-upload-url",
    "headers": {
      "content-type": "video/mp4"
    },
    "expiresAt": "ISO-8601"
  }
}
```

Possible errors: `400 INVALID_VIDEO_REQUEST`, `413 VIDEO_TOO_LARGE`, `415 UNSUPPORTED_VIDEO_TYPE`, `503 VIDEO_STORAGE_UNAVAILABLE`.

## POST /videos/:videoId/upload-completed

Confirma o objeto do proprietário. Não recebe storage key ou metadata fornecida pelo cliente. Repetição após confirmação é sucesso idempotente.

Response `200`:

```json
{
  "id": "uuid",
  "status": "PENDING",
  "progress": null,
  "uploadedAt": "ISO-8601"
}
```

Possible errors: `400 INVALID_VIDEO_REQUEST`, `404 VIDEO_NOT_FOUND`, `409 VIDEO_UPLOAD_NOT_FOUND`, `409 VIDEO_UPLOAD_MISMATCH`, `409 VIDEO_UPLOAD_INVALID_STATE`, `503 VIDEO_STORAGE_UNAVAILABLE`.

## GET /videos

Query:

```text
GET /videos?limit=20&cursor=<opaque-url-safe-cursor>
```

`limit` defaults to 20 and cannot exceed 100. Ordering is `createdAt DESC, id DESC`.

Response `200`:

```json
{
  "items": [
    {
      "id": "uuid",
      "filename": "sample.mp4",
      "status": "PENDING",
      "progress": null,
      "createdAt": "ISO-8601"
    }
  ],
  "page": {
    "nextCursor": "opaque-or-null"
  }
}
```

Malformed cursors return `400 INVALID_CURSOR`.

## GET /videos/:videoId

Response `200`:

```json
{
  "id": "uuid",
  "filename": "sample.mp4",
  "contentType": "video/mp4",
  "sizeBytes": 104857600,
  "status": "PROCESSING",
  "progress": 66.67,
  "createdAt": "ISO-8601",
  "uploadedAt": "ISO-8601"
}
```

A resource that is missing or belongs to another user returns the same `404 VIDEO_NOT_FOUND`.

## GET /videos/:videoId/download

Introduced by EPIC-005 and available only when `COMPLETED`.

Response `200`:

```json
{
  "downloadUrl": "https://signed-download-url",
  "expiresIn": 300
}
```
