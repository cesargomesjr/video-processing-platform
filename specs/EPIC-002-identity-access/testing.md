# Testing — EPIC-002 — Identity & Access

## Strategy

Usar TDD para comportamento novo.

## Unit

Priorizar:

- regras do domínio;
- use cases;
- branches;
- erros;
- edge cases.

## Integration

Cobrir adapters externos introduzidos pelo épico.

## E2E

Usar apenas para fluxos essenciais e contratos externos.

## Required quality gate

```text
lines      >= 80%
statements >= 80%
functions  >= 80%
branches   >= 80%
```

## Regression

Bug fix deve incluir teste de regressão sempre que tecnicamente razoável.

## Determinism

Testes não devem depender de timing arbitrário, internet pública ou estado compartilhado.
