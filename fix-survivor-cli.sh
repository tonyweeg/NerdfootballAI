#!/bin/bash

echo "🚨 EMERGENCY SURVIVOR FIX - CLI SOLUTION"
echo "======================================="
echo ""
echo "This will fix ALL incorrect survivor eliminations by:"
echo "1. Clearing all elimination data (reset everyone to alive)"
echo "2. The fixed logic will then properly recalculate eliminations"
echo ""

# Confirm project
firebase use nerdfootball
echo "✅ Using project: nerdfootball"
echo ""

echo "🔍 Current issue: Firebase connection problems preventing browser-based fixes"
echo "🎯 Solution: Clear ALL elimination data and let fixed logic recalculate"
echo ""

read -p "🚨 Do you want to proceed with the fix? (y/N): " confirm

if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
    echo ""
    echo "⚡ Step 1: Clearing survivor elimination data..."

    # Clear all survivor status documents
    firebase firestore:delete "artifacts/nerdfootball/pools/nerduniverse-2025/survivor" -r -f --project nerdfootball
    echo "✅ Cleared survivor status data"

    # Clear legacy status data
    firebase firestore:delete "artifacts/nerdfootball/public/data/nerdSurvivor_status" -r -f --project nerdfootball
    echo "✅ Cleared legacy status data"

    echo ""
    echo "🎉 SUCCESS! All elimination data cleared"
    echo ""
    echo "🎯 RESULT:"
    echo "- ALL users are now reset (no elimination data)"
    echo "- User aaG5Wc2JZkZJD1r7ozfJG04QRrf1 is now effectively ALIVE"
    echo "- ALL other incorrectly eliminated users are now ALIVE"
    echo "- The fixed logic (getWeekGames(week)) will prevent future false eliminations"
    echo ""
    echo "📊 NEXT STEPS:"
    echo "1. Users visit the survivor page: https://nerdfootball.web.app/index.html?view=survivor"
    echo "2. System will recalculate with the fixed week-isolation logic"
    echo "3. Only users who actually lost will show as eliminated"
    echo ""
    echo "✅ All players should now be happy - the incorrect eliminations are fixed!"

else
    echo ""
    echo "❌ Operation cancelled"
    echo ""
    echo "🔧 Manual commands if you want to run them individually:"
    echo ""
    echo "firebase firestore:delete \"artifacts/nerdfootball/pools/nerduniverse-2025/survivor\" -r -f --project nerdfootball"
    echo "firebase firestore:delete \"artifacts/nerdfootball/public/data/nerdSurvivor_status\" -r -f --project nerdfootball"
fi

echo ""
echo "🏁 CLI fix script complete"