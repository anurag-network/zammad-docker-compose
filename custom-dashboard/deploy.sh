#!/bin/bash
# Deploy SupportHub Dashboard to the Zammad server
# Run this script from the project root on your local machine

set -e

SERVER="ubuntu@65.0.240.201"
KEY="$HOME/Downloads/ticket-portal.pem"
REMOTE_DIR="/home/ubuntu/supportub-dashboard"

echo "📦 Uploading dashboard files to server..."
ssh -i $KEY $SERVER "mkdir -p $REMOTE_DIR"

# Upload all project files (excluding node_modules, dist, .git)
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.git' \
  -e "ssh -i $KEY" \
  ./ $SERVER:$REMOTE_DIR/

echo "🐳 Building and starting dashboard container..."
ssh -i $KEY $SERVER "cd $REMOTE_DIR && \
  docker build -t supporthub-dashboard . && \
  docker rm -f supporthub-dashboard 2>/dev/null || true && \
  docker run -d \
    --name supporthub-dashboard \
    --network zammad-docker-compose_default \
    -p 3001:80 \
    --restart unless-stopped \
    supporthub-dashboard"

echo ""
echo "✅ Dashboard deployed successfully!"
echo "🌐 Access it at: http://65.0.240.201:3001"
echo ""
