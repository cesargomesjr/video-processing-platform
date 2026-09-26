# Design — EPIC-002 — Identity & Access

## Context

Firebase Authentication realiza cadastro, login e armazenamento das credenciais. A API confia apenas em Firebase ID Tokens validados e mantém identidade local para persistência e ownership.

## Runtime flow

```text
Client -> Firebase Auth: cadastro/login com email e senha
Firebase Auth -> Client: Firebase ID Token
Client -> API: Authorization: Bearer <Firebase ID Token>
Presentation -> AuthenticateUser: envia credencial opaca extraída do transporte
AuthenticateUser -> IdentityTokenVerifier: valida token
AuthenticateUser -> ResolveAuthenticatedUser: resolve User por firebaseUid
Application -> use case protegido: executa com UserId interno
```

## Domain

- `User`: entidade com `UserId`, `FirebaseUid`, email e timestamps;
- `UserId`: UUID interno usado nas relações de ownership;
- `FirebaseUid`: identificador externo opaco;
- email é atributo atualizável, não identidade.

O domínio não depende de Firebase, NestJS, PostgreSQL ou variáveis de ambiente.

## Application

Use cases:

- `AuthenticateUser`: coordena a validação da credencial opaca e a resolução da identidade local;
- `ResolveAuthenticatedUser`: localiza ou cria idempotentemente o usuário local a partir de identidade já validada.

```text
VerifiedIdentity {
  subject: string
  email: string | null
  emailVerified: boolean
}
```

A aplicação nunca recebe senha. `AuthenticateUser` recebe somente o valor opaco da credencial já extraído do header pela Presentation; o formato HTTP e o Firebase permanecem fora do caso de uso.

## Ports

- `UserRepository`;
- `IdentityTokenVerifier`, que retorna `VerifiedIdentity`.

O port é agnóstico de provider; somente o adapter contém Firebase no nome.

## Infrastructure

- `FirebaseIdentityTokenVerifier` com `firebase-admin`;
- `PostgresUserRepository`;
- migration `users` com `UNIQUE(firebase_uid)`;
- Application Default Credentials em produção;
- Authentication Emulator via `FIREBASE_AUTH_EMULATOR_HOST` no ambiente local;
- PostgreSQL e Authentication Emulator no Docker Compose.

## Presentation

- extrai `Authorization: Bearer <token>`;
- `PUT /auth/me` valida o token, provisiona/atualiza o usuário idempotentemente e retorna a identidade local;
- rotas protegidas recebem principal contendo o `UserId` interno;
- IDs enviados pelo cliente nunca substituem o principal autenticado.

## HTTP errors

| Condition                                 | Status | Code                            |
| ----------------------------------------- | -----: | ------------------------------- |
| authorization ausente/malformado          |    401 | `AUTHENTICATION_REQUIRED`       |
| token inválido/expirado/projeto incorreto |    401 | `INVALID_IDENTITY_TOKEN`        |
| acesso a recurso alheio                   |    404 | `RESOURCE_NOT_FOUND`            |
| provider indisponível                     |    503 | `IDENTITY_PROVIDER_UNAVAILABLE` |

## Concurrency and idempotency

- `PUT /auth/me` materializa a projeção local sem violar a semântica segura de `GET`;
- `UNIQUE(firebase_uid)` é a garantia contra duplicidade;
- conflito concorrente relê o registro vencedor e retorna o mesmo `UserId`.

## Security

- validar assinatura, expiração, audience/project e issuer com Firebase Admin SDK;
- não decodificar JWT sem verificação criptográfica;
- não aceitar custom token como ID Token;
- nunca registrar senha, token, authorization header ou service account;
- impedir `FIREBASE_AUTH_EMULATOR_HOST` em produção;
- preservar `emailVerified`, sem bloquear acesso neste épico;
- checagem adicional de revogação fica fora do caminho padrão.

## Clean Architecture

- Domain não conhece provider;
- Application define ports;
- Infrastructure implementa;
- Presentation traduz transportes;
- Main compõe.

## Error strategy

- erros do Firebase são traduzidos no adapter;
- Application não conhece códigos do Firebase;
- Presentation mapeia erros conhecidos para o contrato HTTP;
- falha de provider nunca resulta em identidade aceita.

## Readiness

- PostgreSQL participa do readiness;
- configuração Firebase é validada no startup;
- readiness não chama o Firebase remotamente a cada probe.

## Observability

Neste épico, manter apenas logs estruturados existentes, sem dados sensíveis. A suíte completa permanece no EPIC-007.

## Exit criteria

Design pronto quando contratos, migration, configuração, cenários de erro e testes estiverem refletidos nas tasks e rastreabilidade.
