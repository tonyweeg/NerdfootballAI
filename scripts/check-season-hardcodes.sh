#!/bin/bash
# Season hardcode guard — fails when season literals exist outside config/generated/archived files.
# Spec: claudedocs/specs/2026-08-07-season-config-centralization-design.md (v2), success criterion 2.
#
# Pure grep (BSD/GNU portable) — rg is NOT a standalone binary on this machine (it
# exists only as a Claude Code shell function), and this gate must tell the truth
# from any terminal or CI. Tool failures exit 2 loudly instead of a false ✅.
#
# Phases 0-4: EXPECTED TO FAIL — the file list is the migration progress meter.
# Phase 5 exit gate: this script passes, then it joins the pre-deploy checklist.
cd "$(dirname "$0")/.." || exit 2
if [ ! -d public ] || [ ! -d functions ]; then
    echo "❌ guard: public/ and functions/ not found — wrong directory?" >&2
    exit 2
fi

# Third pattern class added 2026-08-08 after a LIVE incident: year-less legacy tree
# literals (artifacts/nerdfootball/public/data/...) carry no year string, so the
# original patterns were blind to them — a page's pick-WRITE went to the 2025-era
# tree on 2026 launch night. Any direct legacy-tree literal outside the wrappers
# (which own LEGACY_DATA_ROOT) and pickAnalytics (legacy trigger, intentional) is
# a defect: pages must use SEASON_CONFIG.paths.* so the year routes the tree.
PATTERN='nerduniverse-20[0-9][0-9]|20[0-9][0-9]-09-0[0-9]|artifacts/nerdfootball/public/data/(nerdfootball_picks|nerdfootball_results|nerdfootball_games|nerdSurvivor_)'
RAW=$(grep -rEl --binary-files=without-match "$PATTERN" public functions \
    --exclude-dir=node_modules \
    --exclude-dir=game-data \
    --exclude-dir=archive \
    --exclude-dir=backups \
    --exclude='season-data.js' \
    --exclude='season-data.json' \
    --exclude='season-config.js' \
    --exclude='seasonConfig.js' \
    --exclude='pickAnalytics.js' \
    --exclude='nfl_*_week_*.json' \
    --exclude='nfl_*_schedule_raw.json' \
    --exclude='*BACKUP*')
STATUS=$?
if [ "$STATUS" -gt 1 ]; then
    echo "❌ guard: grep failed (status ${STATUS})" >&2
    exit 2
fi

MATCHES=$(printf '%s\n' "$RAW" | sed '/^$/d' | sort)
if [ -n "$MATCHES" ]; then
    COUNT=$(printf '%s\n' "$MATCHES" | wc -l | tr -d ' ')
    echo "❌ Season hardcodes remain in ${COUNT} files:"
    echo "$MATCHES"
    exit 1
fi
echo "✅ No season hardcodes outside config."
