# Visão do Produto

## Problema

O projeto-base processa um vídeo e retorna frames em um arquivo ZIP. A evolução proposta precisa transformar esse fluxo simples em uma plataforma capaz de operar de forma confiável com múltiplos usuários, múltiplos vídeos e picos de demanda.

## Visão

Construir uma plataforma distribuída de processamento de vídeos que desacople:

- ingestão;
- análise;
- processamento;
- agregação;
- entrega do resultado;
- notificação.

## Objetivos

1. permitir upload seguro de vídeos;
2. manter o processamento fora do request HTTP;
3. processar vários vídeos simultaneamente;
4. paralelizar um único vídeo por chunks temporais;
5. não perder jobs durante picos;
6. suportar retries e DLQ;
7. impedir processamento duplicado indevido;
8. acompanhar status e progresso;
9. gerar ZIP final;
10. disponibilizar download seguro;
11. notificar falhas;
12. manter rastreabilidade e observabilidade.

## Não objetivos iniciais

- edição de vídeo;
- streaming em tempo real;
- transcoding multi-bitrate;
- computer vision;
- processamento com GPU;
- suporte multi-região;
- SSO corporativo;
- RBAC avançado.

## Princípios

- API não processa vídeo.
- FFmpeg executa trabalho pesado.
- Jobs são assíncronos.
- Chunks são unidades independentes.
- Consumers são idempotentes.
- Containers são stateless.
- Storage é externo.
- Domínio não conhece provider.
- Testabilidade é requisito arquitetural.
