# Kubernetes local (Minikube)

Esta configuração sobe API, worker, web, PostgreSQL, RabbitMQ, Redis, MinIO,
MailHog, Prometheus, Grafana, Loki e Grafana Alloy no namespace `fiapx`. Os dados ficam em PVCs do
cluster local, separados dos volumes do Docker Compose. Os valores em
`infra/k8s/local-secrets.yaml` servem apenas para demonstração local.

## Preparar o cluster

Instale `minikube` e `kubectl`. Reserve pelo menos 4 CPUs e 8 GiB de memória.
Pare o Compose antes de abrir os port-forwards, pois ele usa as mesmas portas:

```bash
docker compose -f infra/docker-compose.yml down
minikube start --driver=docker --cpus=4 --memory=8192
minikube addons enable metrics-server
```

Não use `docker compose down -v`: esse comando removeria os dados dos volumes.
O Metrics Server fornece as métricas de CPU/memória ao HPA da API. O worker
é escalado pelo KEDA com base nas filas RabbitMQ; Prometheus/Grafana são
para observabilidade.

## Instalar KEDA

Instale o operador antes de aplicar os manifests, pois `ScaledObject` e
`TriggerAuthentication` dependem das CRDs do KEDA:

```bash
kubectl apply --server-side -f https://github.com/kedacore/keda/releases/download/v2.21.0/keda-2.21.0.yaml
kubectl wait --for=condition=Established crd/scaledobjects.keda.sh --timeout=2m
kubectl -n keda rollout status deployment/keda-operator --timeout=5m
```

## Construir e aplicar

Execute da raiz do repositório. As três imagens locais são construídas no
runtime do Minikube, sem precisar de registry externo:

```bash
minikube image build -f infra/docker/api.Dockerfile -t fiapx-api:local .
minikube image build -f infra/docker/worker.Dockerfile -t fiapx-worker:local .
minikube image build -f infra/docker/web.Dockerfile -t fiapx-web:local .
kubectl -n fiapx delete hpa worker --ignore-not-found
kubectl apply -k infra
kubectl -n fiapx get pods,pvc,hpa,scaledobject
kubectl -n fiapx rollout status deployment/api --timeout=5m
kubectl -n fiapx rollout status deployment/loki --timeout=5m
kubectl -n fiapx rollout status deployment/alloy --timeout=5m
```

O `infra/kustomization.yaml` reaproveita o SQL de inicialização e o dashboard
do Grafana. O Prometheus usa descoberta dos pods da API para coletar métricas
de todas as réplicas. Grafana Alloy coleta os logs dos pods do namespace `fiapx` e
os envia ao Loki; o Grafana já recebe os datasources Prometheus e Loki. Se atualizar as imagens locais,
reconstrua-as e reinicie a API e o web. Para atualizar o worker quando
ele estiver em zero, o próximo pod criado pelo KEDA já usa a imagem local
nova; se estiver ativo, reinicie-o:

```bash
kubectl -n fiapx rollout restart deployment/api deployment/web
kubectl -n fiapx rollout restart deployment/worker
```

O SQL só roda no primeiro bootstrap de um volume PostgreSQL vazio.

## Acessar no navegador

Abra cada port-forward em um terminal separado:

```bash
kubectl -n fiapx port-forward svc/web 5173:80
kubectl -n fiapx port-forward svc/api 3000:3000
kubectl -n fiapx port-forward svc/minio 9000:9000 9001:9001
kubectl -n fiapx port-forward svc/grafana 3001:3000
kubectl -n fiapx port-forward svc/prometheus 9090:9090
kubectl -n fiapx port-forward svc/mailhog 8025:8025
```

Web: <http://localhost:5173>. API: <http://localhost:3000>.
Grafana: <http://localhost:3001> (`admin`/`admin`). MailHog:
<http://localhost:8025>. Console do MinIO: <http://localhost:9001>
(`minioadmin`/`minioadmin`). A porta 9000 serve a API S3 e precisa continuar
encaminhada para o download de ZIP: a API assina URLs com
`http://localhost:9000`, acessível pelo navegador no host.

## Logs no Grafana

Em Grafana > Explore, selecione o datasource Loki. Exemplos de consultas LogQL:

```logql
{namespace="fiapx", app="api"}
{namespace="fiapx", app="worker"}
{namespace="fiapx", app="worker"} |= "videoId"
{namespace="fiapx"} |= "correlationId"
```

As labels `namespace`, `pod`, `container` e `app` identificam a origem.
`correlationId`, `videoId` e `userId` ficam no corpo JSON dos logs da
aplicação, para consulta sem criar labels de alta cardinalidade. A API envia
`x-correlation-id` nas mensagens RabbitMQ; o worker o preserva entre etapas
e tentativas, permitindo buscar o mesmo ID nos dois serviços. Os demais
serviços também aparecem no Loki quando escrevem logs no stdout/stderr.
O PVC `loki-data` guarda os logs neste cluster local, com retenção de sete dias.

## Autoscaling

O HPA de `infra/k8s/autoscaling.yaml` mantém de 1 a 3 pods da API por
CPU/memória. O KEDA gerencia o worker entre **0 e 4 pods**, conforme o total
de mensagens nas oito filas principais. Ele consulta a API HTTP do RabbitMQ
a cada 5 segundos, incluindo mensagens ainda sem confirmação, e espera 5
minutos de ociosidade antes de voltar a zero. As filas de retry e DLQ não
ativam o worker. O worker conserva o limite local de 4 GiB por pod.

A API declara e vincula as filas antes de aceitar requisições, para que um
upload não seja perdido quando o worker está em zero. Os consumidores fazem
a mesma declaração ao iniciar. O CronJob `recover-stale-chunks` verifica a
cada minuto chunks com lease expirado; se publicar trabalho, KEDA ativa o
worker. O worker também mantém sua recuperação periódica para uso no Compose.

Para demonstrar o ciclo, acompanhe as réplicas, faça um upload e aguarde o
processamento e o período de ociosidade:

```bash
kubectl -n fiapx get deployment worker -w
kubectl -n fiapx get scaledobject worker
kubectl -n fiapx get hpa
kubectl -n fiapx get cronjob recover-stale-chunks
```

No upgrade de um cluster que já usava o HPA do worker, o `kubectl delete hpa`
acima é necessário uma vez, antes de aplicar o ScaledObject, para não deixar
dois controladores no mesmo Deployment. Minikube em um único nó não adiciona
mais CPU/memória física: réplicas acima da capacidade ficarão `Pending`.

## Encerrar

```bash
minikube stop
```

`minikube stop` preserva os PVCs para a próxima inicialização. Não use
`minikube delete` se precisar conservar os dados.
