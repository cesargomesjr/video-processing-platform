# Specification — EPIC-002 — Identity & Access

## Objective

Proteger a API com autenticação por usuário e senha provida pelo Firebase Authentication e autorização por ownership validada no backend.

## Business outcome

Cada operação protegida é associada a um usuário autenticado e nenhum usuário consegue acessar recursos pertencentes a outro usuário.

## Authentication decision

- cadastro e login com email e senha são executados pelo cliente no Firebase Authentication;
- o cliente envia o Firebase ID Token no header `Authorization: Bearer <token>`;
- a API valida o ID Token com o Firebase Admin SDK;
- o claim `uid` validado é persistido localmente como `firebaseUid`;
- a API mantém um `UserId` UUID interno para relações e ownership;
- a API não recebe, persiste ou registra senhas e não emite token de login próprio.

## Scope

- entidade local `User`;
- `UserId` interno e `FirebaseUid` externo;
- validação de Firebase ID Token;
- provisionamento local idempotente;
- `PUT /auth/me`;
- autenticação de rotas protegidas;
- autorização por ownership no backend;
- PostgreSQL, migration e repositório de usuários;
- Firebase Authentication Emulator para integração e E2E local;
- configuração segura do Firebase Admin SDK.

## Out of scope

- frontend de cadastro/login;
- armazenamento ou recuperação de senha pela API;
- emissão de JWT próprio;
- session cookie próprio;
- SSO;
- MFA;
- RBAC avançado;
- custom claims para autorização;
- provisionamento de infraestrutura em cloud;
- observabilidade completa, prevista no EPIC-007.

## Dependencies

Consultar:

- `docs/architecture/architecture.md`;
- `docs/architecture/context-map.md`;
- `docs/decisions/ADR-010-firebase-authentication.md`;
- `docs/security/security-baseline.md`;
- ADRs aplicáveis;
- requisitos dos épicos anteriores.

## Assumptions

- o requisito “protegido por usuário e senha” é atendido pelo Firebase Authentication;
- Firebase é a autoridade sobre credenciais;
- PostgreSQL é a autoridade sobre identidade interna e ownership;
- email não é usado como chave de identidade;
- email verificado não bloqueia autenticação neste épico;
- tokens inválidos ou expirados são rejeitados;
- checagem explícita de revogação fica fora do caminho padrão.

## Risks and mitigations

- **provider leaking**: Application depende de `IdentityTokenVerifier`, não do Firebase SDK;
- **duplicate provisioning**: `firebase_uid` possui constraint `UNIQUE`;
- **IDOR**: ownership deriva do `UserId` resolvido no backend;
- **credential leakage**: credenciais e tokens nunca são registrados;
- **emulator in production**: `FIREBASE_AUTH_EMULATOR_HOST` é proibido em produção;
- **provider unavailable**: a API nunca aceita identidade não verificada.

## Resolved questions

- Provider: Firebase Authentication com email/senha.
- Identidade externa: Firebase `uid`, nomeada `firebaseUid`.
- Identidade interna: UUID gerado pela aplicação.
- Cadastro/login: Firebase client SDK; a API não expõe endpoints de senha.
- Provisionamento: idempotente por `PUT /auth/me`.
- Autorização: server-side com `UserId` interno.

## Open questions

Nenhuma decisão material impede o desenvolvimento. Exigir email verificado e verificar revogação em todas as requisições podem ser evoluções posteriores.
