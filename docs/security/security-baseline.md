# Security Baseline

## Authentication

- cadastro/login com email e senha providos pelo Firebase Authentication;
- Firebase ID Token validado no backend com Firebase Admin SDK;
- assinatura, expiração, issuer e audience/project validados;
- API não recebe nem persiste senha;
- identidade externa `firebaseUid` mapeada para `UserId` interno;
- Application depende de port agnóstico de provider;
- Authentication Emulator permitido apenas fora de produção;
- credenciais Firebase fornecidas por secret/Application Default Credentials;
- credenciais nunca em logs.

## Authorization

- ownership server-side;
- proteção contra IDOR;
- nenhuma autorização dependente apenas do frontend.

## Upload

- validar MIME;
- validar tamanho;
- bloquear extensões inválidas;
- signed URL com escopo restrito.

## Infrastructure

- PostgreSQL privado;
- RabbitMQ privado;
- storage privado;
- secrets fora do Git.

## Logging

Nunca registrar:

- password;
- bearer token;
- authorization header;
- provider secret;
- connection string sensível.
