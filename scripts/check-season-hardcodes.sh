#!/bin/bash
# Season hardcode guard — fails when season literals exist outside config/generated/archived files.
# Spec: claudedocs/specs/2026-08-07-season-config-centralization-design.md (v2), success criterion 2.
#
# Phases 0-4: EXPECTED TO FAIL — the file list is the migration progress meter.
# Phase 5 exit gate: this script passes, then it joins the pre-deploy checklist.
PATTERN='nerduniverse-20[0-9][0-9]|20[0-9][0-9]-09-0[0-9]'
MATCHES=$(rg -l -e "$PATTERN" public functions \
  --glob '!**/node_modules/**' \
  --glob '!**/season-data.js' \
  --glob '!**/season-data.json' \
  --glob '!**/season-config.js' \
  --glob '!**/seasonConfig.js' \
  --glob '!**/game-data/**' \
  --glob '!**/nfl_*_week_*.json' \
  --glob '!**/nfl_*_schedule_raw.json' \
  --glob '!**/nfl_*_week_*_corrected.json' \
  --glob '!**/archive/**' \
  --glob '!**/*BACKUP*' \
  2>/dev/null | sort)

if [ -n "$MATCHES" ]; then
  COUNT=$(echo "$MATCHES" | wc -l | tr -d ' ')
  echo "❌ Season hardcodes remain in ${COUNT} files:"
  echo "$MATCHES"
  exit 1
fi
echo "✅ No season hardcodes outside config."
