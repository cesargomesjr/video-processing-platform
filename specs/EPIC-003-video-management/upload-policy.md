# Upload Policy — EPIC-003

## Input accepted by `POST /videos`

```json
{
  "filename": "sample.mp4",
  "contentType": "video/mp4",
  "sizeBytes": 104857600
}
```

Unknown fields are rejected. Client input never includes owner ID, storage key, status or progress.

## Filename

- required after Unicode-aware trim;
- maximum 255 characters;
- control characters, NUL and path separators are rejected;
- retained only for display/audit;
- never interpolated into storage paths or shell commands.

## Content types and extensions

Initial pairs:

| Content type | Extensions |
|---|---|
| `video/mp4` | `.mp4` |
| `video/quicktime` | `.mov` |
| `video/x-matroska` | `.mkv` |
| `video/webm` | `.webm` |

The declared pair must match case-insensitively. This is an ingestion filter, not proof of media validity; ffprobe validation belongs to EPIC-004.

## Size

- integer greater than zero;
- default maximum `2 GiB` (`2147483648` bytes);
- maximum is configured by `VIDEO_UPLOAD_MAX_BYTES` and validated at startup;
- declaration is checked before resource creation;
- actual object size is checked again at confirmation.

## Storage identity

```text
videos/{videoId}/original.{canonicalExtension}
```

`videoId` and canonical extension are generated/selected by trusted application code. Bucket name and provider endpoint do not belong to the domain.

The bucket is private and versioning is enabled. Confirmation captures `objectVersion`, `etag`, verified content type and verified size. `VideoUploaded.v1` identifies the exact object version so a later overwrite through an unexpired URL cannot change the media selected for processing.

## Signed upload instruction

Default response semantics:

```json
{
  "method": "PUT",
  "url": "https://signed-url",
  "headers": {
    "content-type": "video/mp4"
  },
  "expiresAt": "ISO-8601"
}
```

- default TTL: 15 minutes;
- configurable TTL range: 5 to 60 minutes;
- HTTP method and required headers are part of the signed instruction;
- URL and credentials must never be logged or persisted;
- local Compose uses a public signing endpoint reachable from the host and a private endpoint for server-side operations.

## Confirmation

Confirmation accepts no client assertions about key, version, size or type. The API obtains them from Object Storage.

A valid confirmation requires:

- owned video exists;
- expected storage key exists;
- actual size equals declared size and is within configured maximum;
- actual content type equals the allowed declared type;
- provider supplies an object version and etag;
- current state permits idempotent confirmation.

Expiry prevents new uploads but does not reject a valid object that completed before expiration. Missing or mismatched objects remain unconfirmed.
