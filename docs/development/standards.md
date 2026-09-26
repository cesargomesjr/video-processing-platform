# Standards

## TypeScript

- strict;
- prefer `unknown`;
- avoid `any`;
- return types explícitos em APIs públicas;
- validation não é casting.

## SOLID

- uma responsabilidade coerente;
- dependency inversion via ports;
- interfaces pequenas;
- constructor injection;
- composição sobre herança;
- evitar God Services.

## DDD

- Entity para identidade/lifecycle;
- Value Object para semântica/validação;
- Domain Error para violação;
- Domain Service apenas quando necessário.

## Clean Architecture

- Domain independente;
- Application define contracts;
- Infrastructure implementa;
- Presentation traduz transporte;
- Main compõe.

## Naming

Preferir:

```ts
scheduleVideoChunks();
markChunkAsCompleted();
startVideoProcessing();
completeVideoProcessing();
```

Evitar:

```ts
process();
handle();
updateData();
doStuff();
```
