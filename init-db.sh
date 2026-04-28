#!/bin/bash
cd /Users/susheelkumar/Library/Mobile\ Documents/com~apple~CloudDocs/z-check

# Read the init script and execute each statement
cat neo4j/init.cypher | grep -v "^//" | grep -v "^$" | while IFS= read -r line; do
  if [[ -n "$line" ]]; then
    echo "Executing: $line"
    docker exec zcheck-neo4j cypher-shell -u neo4j -p password "$line"
  fi
done

echo "Database initialization complete!"
