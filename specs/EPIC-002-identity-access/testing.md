# Testing — EPIC-002 — Identity & Access

## Strategy

Usar TDD para comportamento novo.

## Unit

Priorizar:

- regras do domínio;
- use cases;
- branches;
- erros;
- edge cases.

Casos obrigatórios:

- criação e validação de `UserId` e `FirebaseUid`;
- token validado convertido em `VerifiedIdentity`;
- provisionamento novo e retorno de usuário existente;
- conflito concorrente retorna o usuário vencedor;
- regras de ownership usam o `UserId` autenticado.

## Integration

Cobrir:

- migration e constraints de `users` em PostgreSQL real de teste;
- `PostgresUserRepository`;
- `UNIQUE(firebase_uid)` sob concorrência;
- `FirebaseIdentityTokenVerifier` contra Authentication Emulator;
- mapping de claims e erros;
- readiness do PostgreSQL.

## E2E

Cobrir:

- cadastro/login email-senha no Authentication Emulator;
- `PUT /auth/me` com token válido;
- repetição de `PUT /auth/me` preserva o `UserId`;
- ausência de authorization retorna `401`;
- bearer malformado retorna `401`;
- token inválido/expirado retorna `401`;
- token de outro projeto retorna `401`;
- acesso a recurso de outro usuário não revela sua existência;
- fluxo executado sem internet pública.

## Required quality gate

```text
lines      >= 80%
statements >= 80%
functions  >= 80%
branches   >= 80%
```

## Regression

Bug fix deve incluir teste de regressão sempre que tecnicamente razoável.

## Determinism

Testes não devem depender de timing arbitrário, internet pública ou estado compartilhado. Unit tests usam fakes das ports e não importam Firebase Admin SDK, PostgreSQL ou rede.

## Security checks

- nenhuma senha ou credencial Firebase existe no schema local;
- tokens e authorization headers não aparecem em logs;
- `FIREBASE_AUTH_EMULATOR_HOST` é rejeitado em produção;
- arquivos de service account não são versionados.
