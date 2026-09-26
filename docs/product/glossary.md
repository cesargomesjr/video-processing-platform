# Glossário / Ubiquitous Language

| Termo | Definição |
|---|---|
| Video | Recurso de vídeo pertencente a um usuário e sujeito ao ciclo de processamento. |
| Chunk | Intervalo temporal lógico de um vídeo. |
| Analyzer | Componente que obtém metadados com ffprobe. |
| Orchestrator | Componente que cria e agenda chunks. |
| Worker | Consumer responsável por executar um chunk. |
| Aggregator | Componente responsável pelo fan-in e ZIP final. |
| Processing Job | Unidade de trabalho assíncrona. |
| Retry | Nova tentativa de execução após falha transitória. |
| DLQ | Dead Letter Queue usada para falhas definitivas. |
| Signed URL | URL temporária de upload/download. |
| Ownership | Relação que define o proprietário de um recurso. |
| Fan-out | Expansão de um vídeo em múltiplos chunks. |
| Fan-in | Consolidação dos resultados dos chunks. |
| Correlation ID | Identificador que correlaciona logs, jobs e eventos. |
