# Specification — EPIC-003 — Video Management

## Objective

Entregar o ciclo de ingestão do vídeo: criar o recurso, permitir upload direto e privado, confirmar o objeto, publicar trabalho de forma confiável e consultar os vídeos do proprietário.

## Business outcome

O usuário autenticado consegue enviar mais de um vídeo sem a API transportar o arquivo e sem perder a solicitação de processamento quando RabbitMQ estiver temporariamente indisponível.

## Scope

- contexto `video-management` nas camadas Domain, Application, Infrastructure e Presentation;
- entidade `Video` e estados `AWAITING_UPLOAD` e `PENDING`;
- criação de upload com metadados declarados;
- URL assinada para upload direto no MinIO/S3-compatible;
- confirmação idempotente com verificação do objeto;
- persistência PostgreSQL e transactional outbox;
- publicação do evento `VideoUploaded.v1` no RabbitMQ;
- consulta paginada, detalhe, status e progresso do proprietário;
- enforcement de ownership com o `UserId` interno do EPIC-002;
- provisionamento local de MinIO, bucket privado e RabbitMQ;
- health/readiness dos novos componentes.

## Out of scope

- upload do arquivo por meio da API;
- autenticação própria ou uso de `firebaseUid` como foreign key;
- ffprobe, FFmpeg, análise, chunking e consumers de processamento;
- retry e DLQ do consumer de análise, tratados no EPIC-004;
- geração e download do ZIP, tratados no EPIC-005;
- limpeza automática de uploads abandonados;
- quotas comerciais, antivírus, CDN e retenção definitiva;
- suíte completa de logs, métricas e tracing, tratada no EPIC-007.

## Public behavior

1. `POST /videos` valida metadata, persiste `AWAITING_UPLOAD` e retorna instruções temporárias de upload;
2. o cliente envia o arquivo diretamente ao Object Storage privado;
3. `POST /videos/:videoId/upload-completed` verifica o objeto e promove atomicamente para `PENDING`;
4. a mesma transação grava uma mensagem `VideoUploaded.v1` no outbox;
5. o dispatcher publica a mensagem persistentemente no RabbitMQ e confirma antes de marcar o outbox como publicado;
6. `GET /videos` e `GET /videos/:videoId` retornam somente recursos do principal autenticado.

## Dependencies

- EPIC-001: estrutura, testes, CI/CD e imagem da API;
- EPIC-002: Firebase Authentication, `UserId`, ownership e PostgreSQL;
- ADR-001, ADR-002, ADR-003, ADR-004, ADR-006, ADR-007 e ADR-010;
- contratos globais em `docs/architecture`.

## Initial defaults

- tamanho máximo: `2 GiB`, configurável por `VIDEO_UPLOAD_MAX_BYTES`;
- validade da URL: `15 minutos`, configurável entre `5` e `60` minutos;
- formatos iniciais: MP4, QuickTime/MOV, Matroska/MKV e WebM;
- paginação: `20` itens por padrão e máximo de `100`;
- ordenação: `createdAt DESC, id DESC`;
- bucket privado: `fiapx-videos` no ambiente local.

## Risks and controls

| Risk | Control |
|---|---|
| filename malicioso | filename é validado para exibição e nunca compõe a storage key |
| tamanho/tipo forjado | validação na criação e `HEAD/stat` na confirmação; ffprobe será autoritativo no EPIC-004 |
| confirmação duplicada | transição condicional e chave única do outbox |
| DB commit seguido de falha no broker | transactional outbox |
| acesso cruzado | queries sempre recebem `UserId`; recurso alheio responde `404` |
| mensagem perdida sem consumer ativo | exchange, binding e fila `video.analysis` duráveis já são provisionados |
| acoplamento a MinIO/RabbitMQ | ports na Application e adapters na Infrastructure |

## Open questions

Nenhuma decisão material permanece aberta para iniciar TDD. Valores operacionais podem ser ajustados por configuração sem alterar o contrato de domínio.
