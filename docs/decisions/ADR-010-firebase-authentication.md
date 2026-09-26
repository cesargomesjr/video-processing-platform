# ADR-010 — Firebase Authentication

## Status

Accepted

## Context

O desafio exige que o sistema seja protegido por usuário e senha. Implementar armazenamento de senha, recuperação de conta, rotação de credenciais e emissão própria de tokens aumentaria o escopo e a superfície de segurança do backend.

O domínio também precisa de uma identidade local estável para ownership e relações persistidas.

## Decision

Usar Firebase Authentication como autoridade de autenticação com provider email/senha.

- cadastro e login acontecem por meio do Firebase client SDK;
- o cliente envia um Firebase ID Token como bearer token;
- a API valida o token com Firebase Admin SDK;
- o claim Firebase `uid` é armazenado como `firebaseUid`;
- cada usuário possui também um `UserId` UUID interno;
- PostgreSQL mantém a identidade local e as relações de ownership;
- a API não recebe senha e não emite JWT próprio;
- a camada Application depende de `IdentityTokenVerifier`, não do SDK Firebase;
- desenvolvimento e testes de integração usam Firebase Authentication Emulator.

## Data ownership

| Data | Authority |
|---|---|
| email/password credential | Firebase Authentication |
| token validity and claims | Firebase Authentication |
| `firebaseUid` mapping | PostgreSQL |
| internal `UserId` | PostgreSQL/application |
| resource ownership | PostgreSQL/application |

## Consequences

### Positive

- atende ao requisito de usuário/senha sem persistir senha na API;
- reduz implementação de segurança sensível;
- mantém ownership desacoplado do provider;
- permite testes locais com emulator;
- uma futura migração de provider não altera as foreign keys de domínio.

### Negative

- adiciona dependência operacional do Firebase;
- exige configuração segura de credenciais do Admin SDK;
- indisponibilidade do provider pode impedir novas validações;
- fluxo local requer Authentication Emulator;
- revogação imediata exige verificação adicional e custo de latência.

## Security rules

- aceitar somente Firebase ID Token validado, nunca apenas decodificado;
- não aceitar custom token no lugar de ID Token;
- validar o projeto configurado;
- nunca registrar bearer token, senha, authorization header ou service account;
- nunca habilitar `FIREBASE_AUTH_EMULATOR_HOST` em produção;
- authorization e ownership continuam obrigatoriamente server-side.

## Alternatives rejected

- autenticação própria com password hash e JWT: maior escopo e risco sem necessidade do desafio;
- usar `firebaseUid` como primary key de domínio: cria acoplamento entre provider e relações internas;
- confiar somente no frontend: não estabelece boundary de segurança.
