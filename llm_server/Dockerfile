FROM ghcr.io/ggml-org/llama.cpp:server AS base

# Download model at build time so it's baked into the image.
FROM alpine:3.21 AS model-fetcher
#   ┌──────────────────────────────────┬────────────┬────────────┬───────────────┬─────────────────┐                                                                                                                      
#   │              Option              │ Model size │ RAM needed │ Speed (2 CPU) │     Quality     │
#   ├──────────────────────────────────┼────────────┼────────────┼───────────────┼─────────────────┤                                                                                                                      
#   │ Qwen2.5-3B Q4_K_M                │ ~2.0 GB    │ 4 GB+      │ ~3 tok/s      │ Good            │
#   ├──────────────────────────────────┼────────────┼────────────┼───────────────┼─────────────────┤
#   │ Qwen2.5-1.5B Q4_K_M              │ ~1.0 GB    │ ~2 GB      │ ~8 tok/s      │ Decent          │                                                                                                                      
#   ├──────────────────────────────────┼────────────┼────────────┼───────────────┼─────────────────┤                                                                                                                      
#   │ Qwen2.5-0.5B Q4_K_M              │ ~0.4 GB    │ ~1 GB      │ ~15 tok/s     │ Unreliable JSON │                                                                                                                      
#   └──────────────────────────────────┴────────────┴────────────┴───────────────┴─────────────────┘
# We select 1.5B for now, as it was too slow locally for 3B and also won't run in a k8s pod easily
ARG MODEL_URL=https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf
ARG MODEL_FILENAME=Qwen2.5-1.5B-Instruct-Q4_K_M.gguf
RUN apk add --no-cache curl && \
    mkdir -p /models && \
    curl -L "${MODEL_URL}" -o "/models/${MODEL_FILENAME}"

FROM base
COPY --from=model-fetcher /models /models

EXPOSE 8080

ENTRYPOINT ["/app/llama-server"]
CMD ["-m", "/models/Qwen2.5-1.5B-Instruct-Q4_K_M.gguf", \
     "--host", "0.0.0.0", "--port", "8080", \
     "--ctx-size", "4096", "--n-predict", "2048", \
     "-ngl", "35"]
