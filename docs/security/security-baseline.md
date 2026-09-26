# Security Baseline

## Authentication

- password hash seguro;
- token com expiração;
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
