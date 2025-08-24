#!/bin/bash

TARGET_BLOCK=9045041
API_URL="https://api.studio.thegraph.com/query/119398/sepolia-transactions/v1.0.2"

echo "🔍 监控 Subgraph 同步进度..."
echo "目标区块: $TARGET_BLOCK"
echo "---"

while true; do
    CURRENT=$(curl -s -X POST -H "Content-Type: application/json" \
        -d '{"query":"{ _meta { block { number } } }"}' \
        $API_URL | grep -o '"number":[0-9]*' | cut -d':' -f2)
    
    if [[ -n "$CURRENT" ]]; then
        REMAINING=$((TARGET_BLOCK - CURRENT))
        PROGRESS=$((100 * CURRENT / TARGET_BLOCK))
        
        printf "\r当前区块: %s | 剩余: %s | 进度: %s%% " $CURRENT $REMAINING $PROGRESS
        
        if [ $CURRENT -ge $TARGET_BLOCK ]; then
            echo -e "\n✅ 同步完成！可以查询交易了"
            break
        fi
    fi
    
    sleep 30
done