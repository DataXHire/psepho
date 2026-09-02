#!/bin/bash
set -e

echo "=== AFTER_CLOSE LEAK CHECK ==="
# 1. Create poll with visibility: after_close
CREATE_RESP=$(curl -s -X POST http://localhost:3000/api/polls \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Leak Check Poll: Secret Future Launch?",
    "kind": "single",
    "options": ["Option Red", "Option Blue", "Option Green"],
    "integrity": "device",
    "visibility": "after_close"
  }')

echo "Created Poll Response: $CREATE_RESP"
SLUG=$(echo "$CREATE_RESP" | grep -o '"slug":"[^"]*' | cut -d'"' -f4)
echo "Slug: $SLUG"

# Fetch poll to get option IDs
POLL_JSON=$(curl -s http://localhost:3000/api/polls/$SLUG)
OPT1=$(echo "$POLL_JSON" | grep -o '"id":"[^"]*' | head -n 2 | tail -n 1 | cut -d'"' -f4)
OPT2=$(echo "$POLL_JSON" | grep -o '"id":"[^"]*' | head -n 3 | tail -n 1 | cut -d'"' -f4)
OPT3=$(echo "$POLL_JSON" | grep -o '"id":"[^"]*' | head -n 4 | tail -n 1 | cut -d'"' -f4)

echo "Casting 3 ballots for different options..."
curl -s -X POST http://localhost:3000/api/polls/$SLUG/ballot \
  -H "Content-Type: application/json" \
  -d "{\"choice\": [\"$OPT1\"], \"ballotToken\": \"token-voter-one-12345678\"}" > /dev/null

curl -s -X POST http://localhost:3000/api/polls/$SLUG/ballot \
  -H "Content-Type: application/json" \
  -d "{\"choice\": [\"$OPT2\"], \"ballotToken\": \"token-voter-two-12345678\"}" > /dev/null

curl -s -X POST http://localhost:3000/api/polls/$SLUG/ballot \
  -H "Content-Type: application/json" \
  -d "{\"choice\": [\"$OPT3\"], \"ballotToken\": \"token-voter-three-12345678\"}" > /dev/null

echo "Curling /api/polls/$SLUG/tally directly..."
RAW_TALLY=$(curl -s http://localhost:3000/api/polls/$SLUG/tally)
echo "Raw JSON response:"
echo "$RAW_TALLY"

if echo "$RAW_TALLY" | grep -q '"tallies":null' && echo "$RAW_TALLY" | grep -q '"totalBallots":3'; then
  echo "✓ Leak Check PASSED: 'tallies' is null, only totalBallots is present, zero option breakdowns leaked!"
else
  echo "✗ Leak Check FAILED!"
  exit 1
fi
