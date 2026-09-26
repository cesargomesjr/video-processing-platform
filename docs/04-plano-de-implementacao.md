# 04 — Plano de Implementação

## 1. Estratégia de decomposição

O `legacy/main.go` é um monólito de 496 linhas, sem testes, sem persistência e sem autenticação. Não existe
"refatoração incremental" possível: **não há domínio a preservar**. A estratégia correta é
**reescrever guiado por testes**, reaproveitando apenas a definição funcional do comando FFmpeg e a
taxonomia de formatos (`docs/01-analise-projeto-base.md`, seção 5).

O que **não** fazer: portar `legacy/main.go` linha por linha para TypeScript. Isso só trasladaria os mesmos
problemas de arquitetura para outra sintaxe.

Regra de ouro da execução: **sempre deixar o sistema rodando ponta a ponta**. Cada fase termina com um
fluxo completo funcionando, mesmo que simplificado. Hackathon não premia meio sistema elegante.

## 2. Fases

### Fase 0 — Fundação (bloqueia todo o resto)

| #   | Entrega                                                                   | Critério de saída                                     |
| --- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| 0.1 | Bootstrap NestJS + TypeScript strict + ESLint + Prettier                  | `npm run build` e `npm run lint` verdes               |
| 0.2 | Estrutura de pastas conforme `docs/02-arquitetura-alvo.md`, seção 6       | Pastas criadas com um módulo placeholder por contexto |
| 0.3 | Jest configurado com cobertura e _thresholds_ em 80%                      | `npm run test:cov` falha se abaixo de 80%             |
| 0.4 | `infra/docker-compose.yml` com Postgres, RabbitMQ, Redis, MinIO, MailHog  | `docker compose up -d` e todos os healthchecks verdes |
| 0.5 | `platform/config` validando variáveis de ambiente com Zod                 | App não sobe se faltar variável obrigatória           |
| 0.6 | Logger Pino + `correlationId` middleware                                  | Log de request com id de correlação                   |
| 0.7 | `dependency-cruiser` (ou `eslint-plugin-boundaries`) no CI                | Build quebra se `domain` importar `infrastructure`    |
| 0.8 | Workflow `.github/workflows/ci.yml` (lint + typecheck + test:cov + build) | PR com pipeline verde                                 |
| 0.9 | Duas imagens Docker: `api` (sem FFmpeg) e `worker` (com FFmpeg)           | `docker compose build` produz as duas imagens         |

### Fase 1 — Identidade

| #   | Entrega                                                 | Teste primeiro                                |
| --- | ------------------------------------------------------- | --------------------------------------------- |
| 1.1 | `Email`, `PlainPassword`, `PasswordHash` (VOs)          | Formato inválido, normalização, senha fraca   |
| 1.2 | Entity `User` + `UserRegistered`                        | Invariantes e igualdade por id                |
| 1.3 | Ports `UserRepository`, `PasswordHasher`, `TokenIssuer` | Fakes em memória                              |
| 1.4 | `RegisterUserUseCase`, `AuthenticateUseCase`            | E-mail duplicado → erro; senha errada → `401` |
| 1.5 | Adapters: repo Postgres, bcrypt, JWT                    | Integração com Testcontainers                 |
| 1.6 | `AuthController` + `JwtGuard`                           | E2E: rota protegida sem token → `401`         |

### Fase 2 — video-management (fluxo mínimo ponta a ponta)

| #    | Entrega                                                                                 | Teste primeiro                                         |
| ---- | --------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 2.1  | VOs `VideoFormat`, `VideoSize`, `VideoDuration`, `VideoId`                              | `.exe` rejeitado; tamanho no limite; duração no limite |
| 2.2  | Entity `Video` + `VideoStatus.canTransitionTo`                                          | Todas as transições válidas e inválidas (RN-03)        |
| 2.3  | `VideoOwnershipPolicy`                                                                  | Dono acessa; terceiro não (RN-04)                      |
| 2.4  | Ports `VideoRepository`, `VideoStorage`, `MessagePublisher`, `SignedUrlGenerator`       | —                                                      |
| 2.5  | `UploadVideoUseCase`                                                                    | UC-03 completo, incluindo `ownerId` vindo do token     |
| 2.6  | `ListUserVideosUseCase`, `GetVideoStatusUseCase`                                        | Paginação e isolamento entre usuários                  |
| 2.7  | `RequestDownloadUseCase`                                                                | `409` se não `COMPLETED`; `404` para terceiro          |
| 2.8  | Adapters: `PostgresVideoRepository`, `S3VideoStorage`, `RabbitMQMessagePublisher`       | Integração com Testcontainers                          |
| 2.9  | `VideosController` + validação de upload                                                | E2E: upload → `202` com status `PENDING`               |
| 2.10 | **Marco:** worker fake consome `VideoUploaded` e move para `COMPLETED` com um ZIP vazio | Demo ponta a ponta funcionando                         |
| 2.11 | Página `web` mínima: upload, listagem de status e botão de download                     | Fluxo completo executado pelo navegador                |

> O item 2.10 é deliberado: entrega valor visível cedo e valida toda a tubulação (HTTP → banco →
> fila → worker → storage → download) antes de existir qualquer FFmpeg.

### Fase 3 — video-processing (núcleo do desafio)

| #    | Entrega                                                                                           | Teste primeiro                                                                 |
| ---- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 3.1  | `ChunkPlan` (domain policy)                                                                       | Tabela de casos: 1s, 10s, 11s, múltiplo exato, `maxChunks`                     |
| 3.2  | Entity `Chunk` + `ChunkStatus`                                                                    | `COMPLETED` não volta (RN-02)                                                  |
| 3.3  | `ExtractFramesSpec`                                                                               | Nomes determinísticos e `-start_number` correto (RN-06)                        |
| 3.4  | `ChunkCompletionPolicy`                                                                           | Agregar com chunk pendente → erro (RN-01)                                      |
| 3.5  | Ports `VideoAnalyzer`, `FrameExtractor`, `FrameStorage`, `ArchiveBuilder`                         | Fakes                                                                          |
| 3.6  | `AnalyzeVideoUseCase`                                                                             | Duração inválida → `FAILED`                                                    |
| 3.7  | `PlanChunksUseCase`                                                                               | Idempotente: rodar duas vezes não duplica chunk                                |
| 3.8  | `ProcessChunkUseCase`                                                                             | Duplicata; claim perdido; falha de FFmpeg; contagem de frames                  |
| 3.9  | `AggregateChunksUseCase`                                                                          | Último chunk → evento; evento duplicado → um só                                |
| 3.10 | `PackageArchiveUseCase`                                                                           | ZIP com frames em ordem; `zipKey` só após upload                               |
| 3.11 | Adapters: `FFprobeAnalyzer`, `FFmpegFrameExtractor`, `ZipArchiveBuilder`, `S3FrameStorage`        | Integração: FFmpeg real com vídeo de fixture curto                             |
| 3.12 | Consumers RabbitMQ com retry/backoff/DLQ                                                          | Integração com Testcontainers/RabbitMQ                                         |
| 3.13 | _Reaper_ de chunks `PROCESSING` com `locked_until < now()`, com renovação de lease no worker vivo | Integração: chunk travado volta para `PENDING`; lease renovada não é roubada   |
| 3.14 | **Marco:** vídeo real → N chunks paralelos → ZIP com todos os frames                              | E2E com vídeo de fixture                                                       |
| 3.15 | Caminho de falha: `ChunkFailed` → vídeo `FAILED` → notificação de e-mail                          | Teste: chunk que falha sempre leva o vídeo a `FAILED` e dispara e-mail (RN-09) |

### Fase 4 — Resiliência e qualidade

| #   | Entrega                                                         | Critério de saída                                  |
| --- | --------------------------------------------------------------- | -------------------------------------------------- |
| 4.1 | Repescagem de vídeos `PENDING`/`ANALYZED` antigos               | Teste: broker derrubado e religado não perde vídeo |
| 4.2 | Transações e compare-and-set revisados                          | Nenhuma transição crítica sem `WHERE status = ...` |
| 4.3 | Suíte E2E: upload, status, agregação, download, falha, retry    | 6 cenários do edital cobertos                      |
| 4.4 | Cobertura >= 80% global, > 95% em domain/application            | Relatório no CI                                    |
| 4.5 | `--scale worker=3` validado                                     | 3 vídeos simultâneos concluídos corretamente       |
| 4.6 | Rate limiting em Redis: login por IP+e-mail, upload por usuário | `429` + `Retry-After`; brute force fica inviável   |

### Fase 5 — Observabilidade

| #   | Entrega                                                           | Critério de saída                              |
| --- | ----------------------------------------------------------------- | ---------------------------------------------- |
| 5.1 | `/metrics` com as métricas da seção 8 de `02-arquitetura-alvo.md` | `curl /metrics` retorna as séries              |
| 5.2 | Dashboard Grafana provisionado por arquivo                        | Dashboard abre com dados após um processamento |
| 5.3 | `/health/live` e `/health/ready`                                  | `ready` retorna `503` com dependência fora     |
| 5.4 | Tracing OTel HTTP → AMQP → worker                                 | Um trace único por vídeo                       |

### Fase 6 — Entrega

| #   | Entrega                                                                   |
| --- | ------------------------------------------------------------------------- |
| 6.1 | `README.md` raiz com: como rodar, arquitetura, decisões e roteiro da demo |
| 6.2 | `infra/db/01-schema.sql` + `02-seed.sql`                                  |
| 6.3 | Diagramas atualizados e ADRs revisados                                    |
| 6.4 | Manifests K8s (opcional, e somente se houver tempo)                       |
| 6.5 | Roteiro do vídeo de 10 minutos e ensaio cronometrado                      |

**K8s é opcional.** Docker Compose atende ao edital ("Docker + Kubernetes **ou** Docker Compose").
Prefira investir o tempo em testes, observabilidade e resiliência — que são critérios de avaliação
de conteúdo, não de tecnologia.

### Orçamento de tempo sugerido

Proposta a validar com o grupo, assumindo 4 integrantes e ~20h de trabalho efetivo por pessoa:

| Fase                           | Horas (time inteiro) | Se estourar o prazo                                                     |
| ------------------------------ | -------------------- | ----------------------------------------------------------------------- |
| 0 — Fundação                   | 4h                   | Não corte: é o que evita retrabalho e retrabalho custa mais que 4h      |
| 1 — Identidade                 | 3h                   | Sem reset de senha, sem refresh token                                   |
| 2 — Fluxo mínimo ponta a ponta | 6h                   | Mova a UI (2.11) para o fim                                             |
| 3 — Processamento              | 12h                  | **Prioridade máxima.** Reduza `fps` antes de reduzir cobertura de teste |
| 4 — Resiliência e segurança    | 4h                   | Corte rate limiting antes de cortar retry/DLQ                           |
| 5 — Observabilidade            | 4h                   | Mantenha métricas e health; Grafana é o primeiro a cair                 |
| 6 — Entrega                    | 4h                   | Não corte                                                               |
| **Total**                      | **~37h**             | —                                                                       |

## 3. Ordem de ataque (se o prazo apertar)

Priorize sempre o que é **avaliado** e o que a **demo** mostra:

```text
1. Fluxo ponta a ponta funcionando (upload → fila → worker → zip → download)
2. Um vídeo dividido em chunks paralelos, com idempotência
3. Autenticação + isolamento por usuário
4. Testes unitários de domínio/aplicação + cobertura no CI
5. Retry + DLQ + caminho de falha + notificação de e-mail
6. UI mínima (upload, status, download)
7. Observabilidade (métricas, logs, health) + rate limiting em Redis
8. Extras (K8s, outbox transacional, tracing distribuído)
```

Corte, se necessário: rate limiting pode virar um limite global simples; K8s fica apenas
documentado; outbox transacional é descartado.

## 4. Pipeline CI/CD (`.github/workflows/ci.yml`)

```text
on: [push, pull_request]
jobs:
  quality:
    - actions/checkout
    - actions/setup-node (cache npm)
    - npm ci
    - npm run lint              # inclui dependency-cruiser
    - npm run typecheck         # tsc --noEmit
    - npm run test:cov          # unit + integração, falha se < 80%
    - npm run build
    - upload do relatório de cobertura como artefato
  docker:
    - docker build da imagem api/worker
  deploy:                        # opcional
    - somente em main, após quality
```

O job de qualidade **não** deve precisar de serviços externos: testes unitários usam fakes; testes de
integração sobem suas próprias dependências com Testcontainers.

## 5. Scripts esperados no `package.json`

```text
npm run lint          -> eslint . --max-warnings=0
npm run typecheck     -> tsc --noEmit
npm run test          -> jest
npm run test:unit     -> jest --selectProjects unit
npm run test:integration -> jest --selectProjects integration
npm run test:e2e      -> jest --selectProjects e2e
npm run test:cov      -> jest --coverage
npm run build         -> nest build (api) + tsc (worker)
npm run start:api     -> node apps/api/dist/main.js
npm run start:worker  -> node apps/worker/dist/main.js
npm run db:migrate    -> migrations
npm run compose:up    -> docker compose -f infra/docker-compose.yml up -d
```

## 6. Estratégia de testes

| Camada     | Escopo                                                                         | Ferramenta                         | Sem                         |
| ---------- | ------------------------------------------------------------------------------ | ---------------------------------- | --------------------------- |
| Unit       | Domain (VOs, entities, políticas), application (use cases com fakes)           | Jest                               | Banco, fila, FFmpeg, rede   |
| Integração | Repositórios Postgres, publisher/consumer RabbitMQ, adapter FFmpeg, storage S3 | Jest + Testcontainers              | Mocks do que está sob teste |
| E2E        | Auth, upload, processamento, status, agregação, download, falha/retry          | Supertest + Compose/Testcontainers | —                           |

Regras não negociáveis:

- Teste escrito **antes** da implementação para comportamento de negócio (RED → GREEN → REFACTOR).
- Bug corrigido → teste de regressão que falhava antes.
- Nunca mockar o comportamento sob teste; nunca testar método privado.
- Nunca afrouxar assertiva nem remover teste para o CI ficar verde.

Fakes obrigatórios (mantêm os testes rápidos e determinísticos):

```text
InMemoryVideoRepository      InMemoryUserRepository
FakeFrameExtractor           FakeVideoAnalyzer
FakeMessagePublisher         FakeVideoStorage
FakeNotificationGateway      FixedClock / SequentialIdGenerator
```

## 7. Definition of Done (por item de trabalho)

```text
[ ] comportamento de negócio explícito no domínio/aplicação
[ ] nenhuma regra de negócio em controller ou consumer
[ ] dependências apontando para dentro (dependency-cruiser verde)
[ ] teste escrito antes e passando
[ ] nenhuma transição de estado crítica sem proteção atômica
[ ] consumidor idempotente (mensagem duplicada = no-op + ACK)
[ ] nenhum contexto escreve em tabela de outro contexto
[ ] lease de chunk renovada e expirada corretamente (worker lento não é roubado)
[ ] erros de infraestrutura mapeados no adapter, sem vazar SDK/ORM
[ ] logs sem segredo, com correlationId/videoId
[ ] lint + typecheck + testes + cobertura >= 80% + build verdes
[ ] nenhuma refatoração não relacionada incluída
```

## 8. Checklist dos entregáveis do hackathon

| Entregável                  | Onde fica                                           | Status           |
| --------------------------- | --------------------------------------------------- | ---------------- |
| Documentação da arquitetura | `docs/01` a `docs/04`                               | ✅ escrito       |
| Script de criação do banco  | `infra/db/01-schema.sql` + migrations               | ⏳ a implementar |
| Código no GitHub            | `github.com/cesargomesjr/video-processing-platform` | ⏳ a implementar |
| CI/CD                       | `.github/workflows/ci.yml`                          | ⏳ a implementar |
| Testes com cobertura >= 80% | `test/` + `npm run test:cov`                        | ⏳ a implementar |
| Vídeo de 10 min             | roteiro em `docs/`                                  | ⏳ a preparar    |

## 9. Riscos de execução

| Risco                                                                     | Probabilidade | Impacto | Mitigação                                                                      |
| ------------------------------------------------------------------------- | ------------- | ------- | ------------------------------------------------------------------------------ |
| FFmpeg difícil de testar                                                  | Alta          | Médio   | Adapter atrás de port; unit testa com fake; integração com vídeo fixture de 2s |
| Chunking com bordas erradas (último frame, duração exata)                 | Alta          | Alto    | `ChunkPlan` é função pura com tabela de casos **antes** de tocar em FFmpeg     |
| Chunk duplicado gera frames duplicados                                    | Média         | Alto    | Nomes determinísticos + `UNIQUE(video_id, chunk_index)`                        |
| ZIP corrompido por crash no meio                                          | Média         | Alto    | Upload para chave temporária e só então mover/marcar `zipKey`                  |
| Broker indisponível perde vídeo                                           | Média         | Alto    | Persistir antes de publicar + repescagem de `PENDING` antigos                  |
| Tempo insuficiente para tudo                                              | Alta          | Alto    | Ordem de ataque da seção 3; fase 2.10 garante demo cedo                        |
| Ambiente Windows dos integrantes (arquivos `Zone.Identifier`, `__MACOSX`) | Média         | Baixo   | `.gitignore` e não comitar artefatos de download                               |

## 10. Projeto base (`legacy/`)

O protótipo em Go foi movido para [`legacy/`](../legacy/README.md) dentro do monorepo. Ele é **material
de apresentação**: representa o "antes" do comparativo arquitetural descrito em `01`.

```text
[x] main.go, go.mod, go.sum e Dockerfile movidos para legacy/
[x] legacy/README.md explicando o que o protótipo faz e o que não copiar
[x] .gitignore criado (node_modules, dist, coverage, .env, uploads/, outputs/, temp/, *:Zone.Identifier)
[ ] remover __MACOSX/ e os *:Zone.Identifier que sobraram na raiz do workspace
[ ] criar .env.example com todas as variáveis obrigatórias
[ ] garantir que nenhum segredo seja comitado
```

Manter o código no repositório tem valor concreto na demo: o vídeo de 10 minutos pode abrir com o
protótipo rodando e mostrar por que ele não escala. Por isso `legacy/` fica versionado **com README
próprio**, para que ninguém o confunda com a plataforma — e nenhuma linha dele deve ser portada
(ver `01`, seção 5).

Os diretórios `uploads/`, `outputs/` e `temp/` não foram movidos: eram criados em runtime por
`createDirs()` e não continham código. O equivalente na nova plataforma é o object storage.
