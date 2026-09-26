# Roadmap

```mermaid
flowchart LR
    E1[EPIC-001 Foundation]
    E2[EPIC-002 Identity + PostgreSQL]
    E3[EPIC-003 Video Management + RabbitMQ + MinIO]
    E4[EPIC-004 Distributed Processing]
    E5[EPIC-005 Aggregation]
    E6[EPIC-006 Notification]
    E7[EPIC-007 Open Source Observability]

    E1 --> E2
    E2 --> E3
    E3 --> E4
    E4 --> E5
    E5 --> E6
    E6 --> E7
```

## Capability placement

- EPIC-001 entrega core arquitetural, testes, CI/CD e imagem da API;
- EPIC-002 introduz PostgreSQL para persistência de identidade;
- EPIC-003 introduz RabbitMQ e MinIO para o fluxo de vídeos;
- EPIC-007 implementa prioritariamente logs, métricas e tracing com uma suíte open source.

Testabilidade e segurança são consideradas desde o primeiro épico. A instrumentação completa de observabilidade é deliberadamente adiada para o EPIC-007.
