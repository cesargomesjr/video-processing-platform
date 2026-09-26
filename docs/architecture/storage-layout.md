# Layout de Object Storage

```text
videos/
  {videoId}/
    original.{canonicalExtension}

frames/
  {videoId}/
    chunk-0001/
      frame-000001.jpg
      frame-000002.jpg
    chunk-0002/
      ...

results/
  {videoId}/
    frames.zip
```

## Upload source

- `videoId` e extensão canônica são definidos pela aplicação;
- filename fornecido pelo usuário nunca compõe a key;
- bucket é privado e versionado;
- confirmação persiste `objectVersion`, etag, tamanho e content type verificados;
- eventos e workers identificam a versão exata do objeto, não apenas a key;
- URL assinada concede somente a operação e janela necessárias.

## Regras gerais

- paths determinísticos;
- storage privado, sem leitura anônima;
- URL assinada para acesso externo;
- credenciais e URLs assinadas não são persistidas nem registradas;
- frame output pode ser removido por política de retenção após ZIP final;
- worker não depende do filesystem local como fonte de verdade.
