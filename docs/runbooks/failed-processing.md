# Runbook — Falha de Processamento

## Cenário

Vídeo em `FAILED` ou mensagem em DLQ.

## Verificações

1. localizar `videoId`;
2. localizar `correlationId`;
3. inspecionar logs do worker;
4. verificar `video_processing_chunks`;
5. identificar último erro;
6. verificar retry count;
7. verificar DLQ;
8. validar disponibilidade do storage;
9. validar execução do FFmpeg.

## Regra

Não reprocessar manualmente um chunk `COMPLETED`.

## Recuperação

Reprocessamento manual deve gerar operação explícita e idempotente.
