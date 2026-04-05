#!/bin/bash

# Script to download the Qwen2.5-3B model for the LLM service
MODEL_DIR="llm_server/models"
MODEL_FILE="Qwen2.5-3B-Instruct-Q4_K_M.gguf"
MODEL_URL="https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf"

# Create models directory if it doesn't exist
mkdir -p "$MODEL_DIR"

if [ -f "$MODEL_DIR/$MODEL_FILE" ]; then
    echo "Model already exists at $MODEL_DIR/$MODEL_FILE"
    exit 0
fi

echo "Downloading $MODEL_FILE to $MODEL_DIR..."
curl -L "$MODEL_URL" -o "$MODEL_DIR/$MODEL_FILE"

if [ $? -eq 0 ]; then
    echo "Successfully downloaded $MODEL_FILE"
else
    echo "Failed to download $MODEL_FILE"
    exit 1
fi
