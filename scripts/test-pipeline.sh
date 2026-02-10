#!/usr/bin/env bash
#
# E2E test script for the template pipeline.
# Submits template jobs via the API and polls until they complete or fail.
#
# Usage:
#   ./scripts/test-pipeline.sh [BASE_URL]
#
# Examples:
#   ./scripts/test-pipeline.sh                    # defaults to http://localhost:3000
#   ./scripts/test-pipeline.sh http://localhost:3001

set -euo pipefail

BASE="${1:-http://localhost:3000}"
API="$BASE/api/templates"
PASS=0
FAIL=0
SKIP=0
RESULTS=()

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${CYAN}[test]${NC} $*"; }
pass() { echo -e "${GREEN}  PASS${NC} $1"; PASS=$((PASS+1)); RESULTS+=("PASS: $1"); }
fail() { echo -e "${RED}  FAIL${NC} $1 — $2"; FAIL=$((FAIL+1)); RESULTS+=("FAIL: $1 — $2"); }
skip() { echo -e "${YELLOW}  SKIP${NC} $1 — $2"; SKIP=$((SKIP+1)); RESULTS+=("SKIP: $1 — $2"); }

# ── Helpers ──────────────────────────────────────────────────────────────

submit_job() {
  local payload="$1"
  curl -sf -X POST "$API" \
    -H 'Content-Type: application/json' \
    -d "$payload" 2>/dev/null
}

poll_job() {
  local job_id="$1"
  local timeout="${2:-300}"  # seconds
  local interval=3
  local elapsed=0

  while [ $elapsed -lt $timeout ]; do
    local resp
    resp=$(curl -sf "$API/$job_id" 2>/dev/null) || { sleep $interval; elapsed=$((elapsed+interval)); continue; }

    local status
    status=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)

    local step
    step=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('step',''))" 2>/dev/null)

    printf "\r    %s [%ds] %s          " "$status" "$elapsed" "$step"

    case "$status" in
      completed) echo; echo "$resp"; return 0 ;;
      failed)
        echo
        local err
        err=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error','unknown'))" 2>/dev/null)
        echo "$err"; return 1
        ;;
    esac

    sleep $interval
    elapsed=$((elapsed+interval))
  done

  echo
  echo "timeout after ${timeout}s"
  return 2
}

# ── Test: API health ─────────────────────────────────────────────────────

log "${BOLD}Test 0: API health check${NC}"
if curl -sf "$API" > /dev/null 2>&1; then
  pass "GET /api/templates returns 200"
else
  fail "GET /api/templates" "API not reachable at $BASE"
  echo -e "\n${RED}API not reachable. Is the dev server running?${NC}"
  exit 1
fi

# ── Test 1: Validation — motion-control without video should fail ────────

log "${BOLD}Test 1: Validation — motion-control without input video${NC}"
resp=$(submit_job '{
  "name": "test-validation-no-video",
  "pipeline": [{
    "id": "s1", "type": "video-generation", "enabled": true,
    "config": { "mode": "motion-control", "imageUrl": "https://example.com/face.png", "prompt": "test" }
  }]
}') || true

if echo "$resp" | grep -qi "video source"; then
  pass "motion-control without video returns validation error"
else
  fail "motion-control without video" "expected validation error, got: $resp"
fi

# ── Test 2: Validation — subtle-animation without video should succeed ───

log "${BOLD}Test 2: Validation — subtle-animation without input video (should accept)${NC}"
resp=$(submit_job '{
  "name": "test-validation-subtle-ok",
  "pipeline": [{
    "id": "s1", "type": "video-generation", "enabled": true,
    "config": { "mode": "subtle-animation", "imageUrl": "https://example.com/face.png", "prompt": "subtle test" }
  }]
}')

job_id=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [ -n "$job_id" ] && [ "$job_id" != "None" ]; then
  pass "subtle-animation without video accepted (job $job_id)"
else
  fail "subtle-animation without video" "expected job creation, got: $resp"
fi

# ── Test 3: Validation — text-overlay without video should fail ──────────

log "${BOLD}Test 3: Validation — text-overlay without input video${NC}"
resp=$(submit_job '{
  "name": "test-validation-text-no-video",
  "pipeline": [{
    "id": "s1", "type": "text-overlay", "enabled": true,
    "config": { "text": "Hello", "position": "bottom" }
  }]
}') || true

if echo "$resp" | grep -qi "video source"; then
  pass "text-overlay without video returns validation error"
else
  fail "text-overlay without video" "expected validation error, got: $resp"
fi

# ── Test 4: Validation — empty pipeline should fail ──────────────────────

log "${BOLD}Test 4: Validation — empty pipeline${NC}"
resp=$(submit_job '{
  "name": "test-empty",
  "pipeline": []
}') || true

if echo "$resp" | grep -qi "required"; then
  pass "empty pipeline returns validation error"
else
  fail "empty pipeline" "expected validation error, got: $resp"
fi

# ── Test 5: Validation — all steps disabled should fail ──────────────────

log "${BOLD}Test 5: Validation — all steps disabled${NC}"
resp=$(submit_job '{
  "name": "test-all-disabled",
  "pipeline": [{
    "id": "s1", "type": "text-overlay", "enabled": false,
    "config": { "text": "Hello", "position": "bottom" }
  }]
}') || true

if echo "$resp" | grep -qi "enabled"; then
  pass "all-disabled pipeline returns validation error"
else
  fail "all-disabled pipeline" "expected validation error, got: $resp"
fi

# ── Test 6: Full pipeline E2E — subtle-animation + text-overlay + bg-music

log "${BOLD}Test 6: Full pipeline — subtle-animation + text-overlay + bg-music${NC}"
log "  (This test submits a real pipeline job. It will take a few minutes.)"
log "  (Requires FAL_KEY to be set for video generation.)"

resp=$(submit_job '{
  "name": "test-full-pipeline",
  "pipeline": [
    {
      "id": "s1", "type": "video-generation", "enabled": true,
      "config": {
        "mode": "subtle-animation",
        "imageUrl": "https://fal.media/files/elephant/IqLxwRJx-sOzblOdvKEhk_b2e2f9c24e42410d9e7a218e0c97c539.jpg",
        "prompt": "person talking naturally, slight head movements, blinking",
        "duration": "4s",
        "aspectRatio": "9:16",
        "resolution": "720p",
        "generateAudio": false
      }
    },
    {
      "id": "s2", "type": "text-overlay", "enabled": true,
      "config": {
        "text": "Testing the pipeline!",
        "position": "bottom",
        "fontSize": 32,
        "fontColor": "#ffffff",
        "bgColor": "rgba(0,0,0,0.5)",
        "paddingX": 16,
        "paddingY": 8
      }
    }
  ]
}')

job_id=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [ -z "$job_id" ] || [ "$job_id" = "None" ]; then
  fail "full pipeline" "failed to create job: $resp"
else
  log "  Job created: $job_id — polling..."
  if result=$(poll_job "$job_id" 600); then
    output_url=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('outputUrl',''))" 2>/dev/null)
    if [ -n "$output_url" ] && [ "$output_url" != "None" ]; then
      pass "full pipeline completed — output: $output_url"
    else
      fail "full pipeline" "completed but no outputUrl"
    fi
  else
    fail "full pipeline" "$result"
  fi
fi

# ── Test 7: List jobs ────────────────────────────────────────────────────

log "${BOLD}Test 7: List jobs includes our test jobs${NC}"
list=$(curl -sf "$API" 2>/dev/null)
count=$(echo "$list" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null)
if [ "$count" -gt 0 ]; then
  pass "GET /api/templates returns $count jobs"
else
  fail "list jobs" "expected jobs, got count=$count"
fi

# ── Summary ──────────────────────────────────────────────────────────────

echo
echo -e "${BOLD}═══════════════════════════════════════${NC}"
echo -e "${BOLD}  Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}, ${YELLOW}$SKIP skipped${NC}"
echo -e "${BOLD}═══════════════════════════════════════${NC}"
echo
for r in "${RESULTS[@]}"; do
  echo "  $r"
done
echo

[ $FAIL -eq 0 ] && exit 0 || exit 1
