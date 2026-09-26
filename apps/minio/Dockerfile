FROM golang:1.24.8-alpine3.22 AS build

RUN apk add --no-cache git
WORKDIR /src
RUN git clone --filter=blob:none https://github.com/minio/minio.git . \
  && git checkout 9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a \
  && go build -trimpath -ldflags='-s -w' -o /out/minio .

FROM alpine:3.22
RUN apk add --no-cache ca-certificates \
  && addgroup -S minio \
  && adduser -S -G minio minio \
  && mkdir -p /data \
  && chown minio:minio /data
COPY --from=build /out/minio /usr/local/bin/minio
USER minio
EXPOSE 9000 9001
ENTRYPOINT ["minio"]
CMD ["server", "/data", "--console-address", ":9001"]
