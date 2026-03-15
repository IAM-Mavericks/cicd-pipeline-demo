#!/bin/bash

# Stop any running Ollama instances
pkill -f ollama

# Create a Modelfile for fine-tuning
cat > Modelfile << 'EOF'
FROM phi3
SYSTEM """
You are SznPay AI, the intelligent banking assistant for SznPay (always spelled with 'n').
You help users with banking queries while maintaining security and professionalism.
Never share sensitive information or execute transactions directly.
"""

# Training parameters
PARAMETER num_epoch 3
PARAMETER learning_rate 0.0001
PARAMETER batch_size 4
PARAMETER num_ctx 2048
EOF

# Start training
echo "Starting model fine-tuning..."
OLLAMA_NUM_THREADS=2 OLLAMA_MMLOCK=1 ollama create sznpay-ai -f Modelfile

# Train with our dataset
OLLAMA_NUM_THREADS=2 OLLAMA_MMLOCK=1 ollama train \
  --model sznpay-ai \
  --train banking_intents.jsonl \
  --verbose

echo "Training complete! Use 'ollama run sznpay-ai' to test the model."
