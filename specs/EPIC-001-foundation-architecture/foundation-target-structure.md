# Target Repository Structure

```text
apps/
└── api/
    └── src/
        ├── contexts/
        │   └── <context>/
        │       ├── domain/
        │       ├── application/
        │       ├── infrastructure/
        │       └── presentation/
        ├── platform/
        └── main/
packages/
infrastructure/
docs/
specs/
```

Não criar context folder ou package compartilhado antes de existir comportamento e consumidor reais.
