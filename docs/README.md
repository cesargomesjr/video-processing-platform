# videoPIC — Documentação de Arquitetura e Especificação

Especificação da nova plataforma de processamento de vídeos, decomposta a partir do projeto base
(`../main.go`, Go/Gin, 496 linhas, monólito single-file).

## Índice

| Documento                                                        | Conteúdo                                                                                                                                                   |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`01-analise-projeto-base.md`](01-analise-projeto-base.md)       | Análise AS-IS do código atual, 14 problemas com evidência, mapa de decomposição legado → novo, **análise da escolha de linguagem**                         |
| [`02-arquitetura-alvo.md`](02-arquitetura-alvo.md)               | Arquitetura TO-BE: diagramas C4, bounded contexts, fluxo de chunks, estrutura de pastas, infraestrutura, observabilidade, 8 ADRs                           |
| [`03-especificacao-funcional.md`](03-especificacao-funcional.md) | Modelo de domínio, 8 regras de negócio, máquinas de estado, 12 casos de uso, contrato HTTP, contrato de eventos, matriz de falhas, DDL completo, segurança |
| [`04-plano-de-implementacao.md`](04-plano-de-implementacao.md)   | Decomposição em 7 fases, ordem de ataque, pipeline CI/CD, estratégia de testes, Definition of Done, riscos, checklist dos entregáveis                      |

## Resumo em cinco linhas

1. O projeto base não tem domínio a preservar: é reescrita guiada por testes, não refatoração.
2. O processamento deixa de ser síncrono e vira **fila + N workers sem estado + object storage**.
3. Um vídeo é dividido em **chunks por janela de tempo**, processados em paralelo e agregados.
4. **Idempotência** vem de nomes determinísticos de frame, `UNIQUE(video_id, chunk_index)` e
   compare-and-set nas transições de estado.
5. Autenticação, isolamento por usuário, notificação de falha e observabilidade entram como
   contextos de primeira classe, não como remendo.

## Registro de decisões da revisão

| #   | Decisão                       | Escolha                                                                                                | Onde impacta                               |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| 1   | Estilo de serviço             | **Microsserviços modulares**: `api`, `worker` e `web` independentes, schema compartilhado              | `02` §3, §7 e ADR-002                      |
| 2   | Extração de frames            | `fps=1` mantido do projeto base                                                                        | `03` §2.3 (`ExtractFramesSpec`)            |
| 3   | Redis                         | Rate limiting no login (IP + e-mail) e no upload (usuário); **sem** cache de status                    | `02` ADR-008 · `03` §5, §9                 |
| 4   | Frontend                      | Página `web` simples: upload, listagem de status e download                                            | `02` §3, §7.1 · `04` item 2.11             |
| 5   | Recuperação de chunk travado  | Lease `worker_id` + `locked_until`, renovada pelo worker vivo                                          | `02` ADR-009 · `03` §2.6, §7.1, §7.2, §8.1 |
| 6   | Notificações                  | Tabela `notifications` própria, com `UNIQUE (video_id, event_type, channel)`                           | `02` ADR-010 · `03` §3.7, §8.1, §10        |
| 7   | Imagens Docker                | Duas: `api` sem FFmpeg, `worker` com FFmpeg                                                            | `02` ADR-011, §7.2                         |
| 8   | Linguagem da plataforma       | TypeScript + NestJS                                                                                    | `01` §7, §8                                |
| 9   | Object storage / e-mail       | MinIO local e MailHog em desenvolvimento                                                               | `02` §7.1                                  |
| 10  | Kubernetes / outbox           | Opcionais; Compose atende ao edital                                                                    | `04` Fase 6, §3                            |
| 11  | Destino do projeto base em Go | Movido para [`legacy/`](../legacy/README.md), com README próprio explicando que é o protótipo original | `04` §10                                   |

### Lacunas corrigidas nesta revisão

| Lacuna encontrada                                                               | Correção aplicada                                                                         |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Chunk `FAILED` deixava o vídeo preso em `PROCESSING` para sempre                | Nova RN-09 + evento `ChunkFailed` + decisão explícita no Aggregator (`03` §2.4, §3.5, §6) |
| Ninguém colocava o vídeo em `PROCESSING`                                        | UC-08 ganhou o compare-and-set `ANALYZED -> PROCESSING` (`03` §3.3)                       |
| Reaper podia roubar chunk de worker vivo e gerar processamento duplo            | Lease com `worker_id` + `locked_until` e renovação pelo worker (`03` §2.6, §7.1, §7.2)    |
| `notification` lia `videos.notified_at`, escrevendo em tabela de outro contexto | Tabela `notifications` própria; `ownerId` chega no payload do evento (`03` §3.7, §8.1)    |
| Uma única imagem Docker com FFmpeg exposta também na API                        | Duas imagens (ADR-011)                                                                    |
| Frontend fora do escopo deixaria a demo limitada a ferramentas de API           | Serviço `web` com página simples                                                          |
| Plano sem orçamento de tempo                                                    | Estimativa por fase em `04` §2                                                            |

## Resposta curta: é exigido manter a linguagem?

**Não.** O documento usa "stack tecnológica **recomendada**" e lista apenas infraestrutura
(containers, mensageria, banco, monitoramento, CI/CD) — nenhuma linguagem é citada. O critério de
avaliação são os conceitos (arquitetura, microsserviços, qualidade, mensageria), e o projeto base é
descrito como ponto de partida sem boas práticas, não como referência a preservar.

**Recomendação:** manter TypeScript + NestJS. Justificativa completa em
[`01-analise-projeto-base.md`](01-analise-projeto-base.md), seções 7 e 8.
