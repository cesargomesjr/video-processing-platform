# ADR-003 — RabbitMQ

## Status
Accepted

## Context
Processamento precisa ser assíncrono e absorver picos.

## Decision
RabbitMQ será o broker inicial.

## Consequences
Assumir entrega at-least-once e implementar idempotência, retry e DLQ.
