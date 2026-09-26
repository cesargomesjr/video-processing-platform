# Contratos HTTP

## Authentication

Cadastro e login com email/senha são realizados pelo cliente no Firebase Authentication. A API não recebe senha e não emite token próprio.

Rotas protegidas recebem:

```http
Authorization: Bearer <firebase-id-token>
```

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

Request:

```http
Authorization: Bearer <firebase-id-token>
```

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

Cria o recurso e inicia o fluxo de upload.

Response `201`:

```json
{
  "id": "uuid",
  "status": "PENDING",
  "uploadUrl": "https://signed-upload-url"
}
```

## POST /videos/:id/upload-completed

Confirma upload e publica `VideoUploaded`.

Response:

```json
{
  "id": "uuid",
  "status": "PENDING"
}
```

## GET /videos

Response:

```json
[
  {
    "id": "uuid",
    "filename": "sample.mp4",
    "status": "PROCESSING",
    "progress": 66.67
  }
]
```

## GET /videos/:id

Response:

```json
{
  "id": "uuid",
  "filename": "sample.mp4",
  "status": "PROCESSING",
  "progress": 66.67,
  "createdAt": "ISO-8601"
}
```

## GET /videos/:id/download

Disponível apenas quando `COMPLETED`.

Response:

```json
{
  "downloadUrl": "https://signed-download-url",
  "expiresIn": 300
}
```

## Erros

Formato padrão:

```json
{
  "code": "VIDEO_NOT_FOUND",
  "message": "Video not found",
  "correlationId": "uuid"
}
```
