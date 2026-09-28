# Kubernetes local (Minikube)

Esta configuração sobe API, worker, web, PostgreSQL, RabbitMQ, Redis, MinIO,
MailHog, Prometheus e Grafana no namespace `fiapx`. Os dados ficam em PVCs do
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
O Metrics Server fornece as métricas necessárias ao HPA; Prometheus/Grafana
são para observabilidade e não alimentam esse HPA.

## Construir e aplicar

Execute da raiz do repositório. As três imagens locais são construídas no
runtime do Minikube, sem precisar de registry externo:

```bash
minikube image build -f infra/docker/api.Dockerfile -t fiapx-api:local .
minikube image build -f infra/docker/worker.Dockerfile -t fiapx-worker:local .
minikube image build -f infra/docker/web.Dockerfile -t fiapx-web:local .
kubectl apply -k infra
kubectl -n fiapx get pods,pvc,hpa
kubectl -n fiapx rollout status deployment/api --timeout=5m
kubectl -n fiapx rollout status deployment/worker --timeout=5m
```

O `infra/kustomization.yaml` reaproveita o SQL de inicialização e o dashboard
e datasource existentes do Grafana. O Prometheus usa descoberta dos pods da API
para coletar métricas de todas as réplicas. Se atualizar as imagens locais,
reconstrua-as e reinicie os Deployments:

```bash
kubectl -n fiapx rollout restart deployment/api deployment/worker deployment/web
```

O SQL só roda no primeiro bootstrap de um volume PostgreSQL vazio.

## Acessar no navegador

Abra cada port-forward em um terminal separado:

```bash
kubectl -n fiapx port-forward svc/web 5173:80
kubectl -n fiapx port-forward svc/api 3000:3000
kubectl -n fiapx port-forward svc/minio 9000:9000
kubectl -n fiapx port-forward svc/grafana 3001:3000
kubectl -n fiapx port-forward svc/prometheus 9090:9090
kubectl -n fiapx port-forward svc/mailhog 8025:8025
```

Web: <http://localhost:5173>. API: <http://localhost:3000>.
Grafana: <http://localhost:3001> (`admin`/`admin`). MailHog:
<http://localhost:8025>. O port-forward do MinIO precisa continuar aberto para
o download de ZIP: a API assina URLs com `http://localhost:9000`, acessível
pelo navegador no host.

## Autoscaling

Os HPAs em `infra/k8s/autoscaling.yaml` mantêm entre 1 e 3 pods da API e entre
1 e 4 pods do worker. Eles calculam a utilização em relação aos **requests**
do pod: alvo de 70% de CPU ou 80% de memória. Se ambas as métricas sugerirem
quantidades diferentes, prevalece a maior. O scale-down espera 5 minutos para
evitar oscilação. Ajuste requests, limites e maxReplicas conforme a capacidade
do computador. O worker tem limite local de 4 GiB porque o empacotamento atual
mantém os frames e o ZIP em memória.

Cada consumidor processa uma mensagem por vez. O worker repesca a cada minuto
chunks pendentes ou com lease expirado há mais de 5 minutos, para recuperar
trabalho interrompido sem reenfileirar continuamente chunks em andamento.

```bash
kubectl -n fiapx top pods
kubectl -n fiapx get hpa -w
kubectl -n fiapx describe hpa worker
```

O HPA não cria workers só porque há mensagens na fila: sem consumo relevante de
CPU/memória, a fila pode crescer sem disparar outra réplica. Para escalar por
backlog do RabbitMQ seria necessário adicionar KEDA ou uma métrica customizada.
Minikube em um único nó também não adiciona mais memória/CPU física; pods acima
da capacidade ficarão `Pending`.

## Encerrar

```bash
minikube stop
```

`minikube stop` preserva os PVCs para a próxima inicialização. Não use
`minikube delete` se precisar conservar os dados.
