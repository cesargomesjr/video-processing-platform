# Contratos HTTP

## POST /auth/register

Request:

```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

Response `201`:

```json
{
  "id": "uuid",
  "email": "user@example.com"
}
```

## POST /auth/login

Response `200`:

```json
{
  "accessToken": "token",
  "expiresIn": 3600
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
