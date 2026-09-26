# Layout de Object Storage

```text
videos/
  {videoId}/
    original.mp4

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

## Regras

- paths determinísticos;
- storage privado;
- URL assinada para acesso externo;
- frame output pode ser removido por política de retenção após ZIP final;
- worker não depende do filesystem local como fonte de verdade.
