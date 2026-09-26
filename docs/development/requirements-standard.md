# Padrão de Requisitos

## Prefixos

```text
FR   Functional Requirement
NFR  Non-Functional Requirement
AR   Architecture Requirement
SEC  Security Requirement
OBS  Observability Requirement
OPS  Operational Requirement
```

## Identificador

```text
E<epic>-<type>-<sequence>
```

Exemplo:

```text
E4-FR-001
E4-NFR-002
E4-SEC-001
```

## Formato

Cada requisito deve conter:

- ID;
- título;
- statement;
- rationale;
- acceptance;
- evidence;
- dependencies;
- risk.

## Exemplo

```md
### E4-NFR-001 — Idempotent consumer

Statement:
The chunk consumer MUST tolerate duplicate delivery.

Rationale:
RabbitMQ delivery is treated as at-least-once.

Acceptance:
A completed chunk is not processed again after redelivery.

Evidence:
Unit + integration tests.
```
