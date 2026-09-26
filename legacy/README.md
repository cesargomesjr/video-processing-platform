# legacy — Protótipo original (Go/Gin)

Este diretório contém o **projeto base** entregue no início do hackathon, movido para cá sem
alterações de código. Ele é material de apresentação: serve como o "antes" do comparativo
arquitetural, não como parte da plataforma.

> **Não use este código como referência de implementação.** Ele é o anti-exemplo descrito em
> [`../docs/01-analise-projeto-base.md`](../docs/01-analise-projeto-base.md).

## O que ele faz

Aplicação Go de arquivo único (496 linhas) que expõe um formulário HTML, recebe um vídeo por
multipart, executa `ffmpeg -vf fps=1` para extrair um frame por segundo, monta um `.zip` e o
disponibiliza para download. Todo o estado vive no disco local.

| Arquivo | Papel |
|---|---|
| `main.go` | Toda a aplicação: HTTP, upload, FFmpeg, ZIP, download, status e UI |
| `go.mod` / `go.sum` | Dependência única: `gin-gonic/gin` |
| `Dockerfile` | Container único; roda `go run main.go` (anti-exemplo de build de produção) |

## Rotas

| Método | Rota | Comportamento |
|---|---|---|
| GET | `/` | Formulário HTML embutido no binário |
| POST | `/upload` | Processa o vídeo **de forma síncrona** dentro do request |
| GET | `/download/:filename` | Serve o ZIP de `./outputs` sem validação do parâmetro |
| GET | `/api/status` | Lista os ZIPs do disco, sem noção de dono |

## Como rodar (apenas para comparação/demo)

```bash
cd legacy
docker build -t fiapx-legacy .
docker run --rm -p 8080:8080 fiapx-legacy
# http://localhost:8080
```

## Limitações conhecidas

Sem autenticação, sem persistência, sem fila, sem idempotência, sem retry, sem testes, sem
observabilidade e sem escala horizontal. A lista completa, com severidade e evidência linha a linha,
está em [`../docs/01-analise-projeto-base.md`](../docs/01-analise-projeto-base.md), seção 4.

## O que foi aproveitado

Somente a definição funcional da extração de frames (`ffmpeg -vf fps=1`) e a taxonomia de extensões
aceitas — ambos reescritos como `ExtractFramesSpec` e `VideoFormat` na nova plataforma. Nenhuma linha
de Go foi portada.

## Artefatos fora deste diretório

As pastas `uploads/`, `outputs/` e `temp/` do projeto original não foram movidas: eram diretórios
vazios criados em runtime por `createDirs()`. No repositório da nova plataforma eles não existem —
o equivalente é o object storage.
