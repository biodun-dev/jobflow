#!/bin/bash

# 1. Submit Parent Job
echo "Submitting Parent Job..."
PARENT_RES=$(curl -s -X POST http://localhost:4000/jobs \
  -H "Content-Type: application/json" \
  -d '{"name":"parent-job", "data":{"msg":"I am the parent"}}')

echo "Parent Response: $PARENT_RES"
PARENT_ID=$(echo $PARENT_RES | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PARENT_ID" ]; then
  echo "Failed to get Parent ID"
  exit 1
fi

echo "Parent ID: $PARENT_ID"

# 2. Submit Child Job (Dependent)
echo "Submitting Child Job (waiting for $PARENT_ID)..."
CHILD_RES=$(curl -s -X POST http://localhost:4000/jobs \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"child-job\", \"data\":{\"msg\":\"I am the child\"}, \"options\":{\"parent\":\"$PARENT_ID\"}}")

echo "Child Response: $CHILD_RES"
