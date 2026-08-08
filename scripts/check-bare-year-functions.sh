#!/bin/bash
# Phase 1 gate: bare year segments in functions/ that the main guard cannot see.
# Flags /2025/-style path segments and quoted year literals OUTSIDE seasonConfig/season-data.
cd "$(dirname "$0")/.." || exit 2
[ -d functions ] || { echo "❌ bare-year: functions/ not found" >&2; exit 2; }
PATTERN="/20[0-9][0-9]/|/20[0-9][0-9]\`|'20[0-9][0-9]'|\"20[0-9][0-9]\"|year[[:space:]]*[=:][[:space:]]*20[0-9][0-9]|[?&]year=20[0-9][0-9]|/year/20[0-9][0-9]"
RAW=$(grep -rEl --binary-files=without-match "$PATTERN" functions \
    --exclude-dir=node_modules \
    --exclude='season-data.json' \
    --exclude='seasonConfig.js')
STATUS=$?
if [ "$STATUS" -gt 1 ]; then echo "❌ bare-year: grep failed (status ${STATUS})" >&2; exit 2; fi
MATCHES=$(printf '%s\n' "$RAW" | sed '/^$/d' | sort)
if [ -n "$MATCHES" ]; then
  COUNT=$(printf '%s\n' "$MATCHES" | wc -l | tr -d ' ')
  echo "❌ Bare year literals remain in ${COUNT} functions files:"
  echo "$MATCHES"
  exit 1
fi
echo "✅ No bare year literals in functions/."
