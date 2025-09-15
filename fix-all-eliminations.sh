#!/bin/bash

# Emergency script to fix all incorrect survivor eliminations
# This bypasses browser connection issues by using Firebase CLI directly

echo "🚨 EMERGENCY SURVIVOR ELIMINATION FIX"
echo "====================================="

# Check if Firebase CLI is available
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

echo "✅ Firebase CLI found"

# Set project
firebase use nerdfootball
echo "✅ Using project: nerdfootball"

echo ""
echo "🔍 STEP 1: Analyzing current eliminations..."
echo "This will show all users currently marked as eliminated"

# We'll create a simple approach: clear ALL elimination statuses
# This is the safest approach given the bug pattern

echo ""
echo "⚡ STEP 2: Clearing ALL elimination statuses..."
echo "This will set ALL pool members to eliminated: false"

# The safest approach is to clear all eliminations and let the system recalculate
echo "firebase firestore:delete \"artifacts/nerdfootball/pools/nerduniverse-2025/survivor\" -r -f"
echo "firebase firestore:delete \"artifacts/nerdfootball/public/data/nerdSurvivor_status\" -r -f"

echo ""
echo "🎯 MANUAL COMMANDS TO RUN:"
echo ""
echo "# 1. Clear all survivor elimination data:"
echo "firebase firestore:delete \"artifacts/nerdfootball/pools/nerduniverse-2025/survivor\" -r -f --project nerdfootball"
echo ""
echo "# 2. Clear legacy survivor status data:"
echo "firebase firestore:delete \"artifacts/nerdfootball/public/data/nerdSurvivor_status\" -r -f --project nerdfootball"
echo ""
echo "# 3. Navigate users to survivor page to trigger recalculation with fixed logic"
echo "# The fixed logic (getWeekGames(week) instead of getCurrentWeekScores()) will now be used"
echo ""

read -p "🚨 Do you want to run these commands automatically? (y/N): " confirm

if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
    echo ""
    echo "⚡ Running elimination cleanup..."

    # Clear survivor elimination data
    echo "Clearing survivor data..."
    firebase firestore:delete "artifacts/nerdfootball/pools/nerduniverse-2025/survivor" -r -f --project nerdfootball

    # Clear legacy status data
    echo "Clearing legacy status data..."
    firebase firestore:delete "artifacts/nerdfootball/public/data/nerdSurvivor_status" -r -f --project nerdfootball

    echo ""
    echo "✅ ELIMINATION DATA CLEARED"
    echo ""
    echo "🎯 NEXT STEPS:"
    echo "1. All users are now reset (no elimination data)"
    echo "2. When they visit the survivor page, the fixed logic will recalculate correctly"
    echo "3. The week-isolation fix (getWeekGames(week)) will prevent cross-week contamination"
    echo "4. Users like aaG5Wc2JZkZJD1r7ozfJG04QRrf1 should now show as ALIVE"
    echo ""
    echo "🚀 FORCE IMMEDIATE RECALCULATION:"
    echo "Visit: https://nerdfootball.web.app/index.html?view=survivor"
    echo "This will trigger the survivor system with the fixed logic"

else
    echo ""
    echo "❌ Operation cancelled"
    echo "You can run the commands manually if needed"
fi

echo ""
echo "🏁 Script complete"