# FFmpeg Execution Strategy

Exemplo conceitual:

```bash
ffmpeg \
  -ss 600 \
  -i input.mp4 \
  -t 300 \
  -vf "fps=1" \
  /tmp/output/frame-%06d.jpg
```

## Regras

- usar `spawn`, não shell concatenation;
- argumentos como array;
- timeout controlado;
- capturar exit code;
- stderr estruturado;
- temp path isolado por chunk;
- cleanup em `finally`;
- output final enviado ao Object Storage;
- filesystem local não é fonte de verdade.
