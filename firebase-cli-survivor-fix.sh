#!/bin/bash

# Firebase CLI Survivor Pool Bug Fix Script
# Bypasses browser permission issues by using direct CLI commands

echo "🔍 FIREBASE CLI SURVIVOR POOL ANALYSIS & REPAIR"
echo "================================================"

# Set Firebase project
FIREBASE_PROJECT="nerdfootball-default"

echo "Setting Firebase project to: $FIREBASE_PROJECT"
firebase use $FIREBASE_PROJECT

echo ""
echo "📊 STEP 1: Extract Pool Members Data"
echo "===================================="

# Extract all pool members
echo "Fetching pool members..."
firebase firestore:get "artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members" > pool_members_raw.json

echo "Pool members data saved to: pool_members_raw.json"

echo ""
echo "📊 STEP 2: Extract Individual User Survivor Data"
echo "==============================================="

# Create directory for user data
mkdir -p survivor_user_data

# Extract user IDs from pool members and get their survivor data
echo "Extracting user survivor data..."

# First, let's get the list of user IDs from the pool members
node -e "
const fs = require('fs');
try {
  const data = fs.readFileSync('pool_members_raw.json', 'utf8');
  const poolData = JSON.parse(data);

  console.log('Pool Members Structure:', JSON.stringify(poolData, null, 2));

  // Extract user IDs - adjust path based on actual structure
  let userIds = [];
  if (poolData.fields && poolData.fields.users) {
    userIds = Object.keys(poolData.fields.users.mapValue.fields);
  } else if (poolData.users) {
    userIds = Object.keys(poolData.users);
  } else {
    console.log('Could not find users in pool data structure');
  }

  console.log('Found user IDs:', userIds);
  fs.writeFileSync('user_ids_list.txt', userIds.join('\n'));

} catch (error) {
  console.error('Error processing pool members:', error.message);
}
"

# Read user IDs and fetch their survivor data
if [ -f "user_ids_list.txt" ]; then
  echo "Fetching individual user survivor data..."
  while IFS= read -r user_id; do
    if [ ! -z "$user_id" ]; then
      echo "Fetching data for user: $user_id"
      firebase firestore:get "artifacts/nerdfootball/public/data/nerd_survivor/$user_id" > "survivor_user_data/${user_id}.json" 2>/dev/null || echo "No survivor data for $user_id"
    fi
  done < user_ids_list.txt
else
  echo "No user IDs found to process"
fi

echo ""
echo "📊 STEP 3: Analyze Elimination Status"
echo "===================================="

# Create analysis script
cat > analyze_eliminations.js << 'EOF'
const fs = require('fs');
const path = require('path');

console.log('🔍 ANALYZING ELIMINATION STATUS');
console.log('================================');

// Read all user survivor data files
const userDataDir = 'survivor_user_data';
const issues = [];
const validUsers = [];

if (fs.existsSync(userDataDir)) {
  const files = fs.readdirSync(userDataDir);

  files.forEach(file => {
    if (file.endsWith('.json')) {
      const userId = file.replace('.json', '');
      try {
        const data = fs.readFileSync(path.join(userDataDir, file), 'utf8');
        const userData = JSON.parse(data);

        console.log(`\n👤 User: ${userId}`);

        // Check if user has elimination status
        let eliminated = false;
        let eliminatedWeek = null;
        let hasValidPicks = false;

        if (userData.fields) {
          // Firebase Firestore format
          if (userData.fields.eliminated) {
            eliminated = userData.fields.eliminated.booleanValue;
          }
          if (userData.fields.eliminatedWeek) {
            eliminatedWeek = userData.fields.eliminatedWeek.integerValue;
          }
          if (userData.fields.picks) {
            hasValidPicks = Object.keys(userData.fields.picks.mapValue.fields || {}).length > 0;
          }
        } else {
          // Direct JSON format
          eliminated = userData.eliminated || false;
          eliminatedWeek = userData.eliminatedWeek || null;
          hasValidPicks = userData.picks && Object.keys(userData.picks).length > 0;
        }

        console.log(`   Eliminated: ${eliminated}`);
        console.log(`   Eliminated Week: ${eliminatedWeek}`);
        console.log(`   Has Picks: ${hasValidPicks}`);

        if (eliminated && !eliminatedWeek) {
          issues.push({
            userId,
            issue: 'ELIMINATED_WITHOUT_WEEK',
            eliminated,
            eliminatedWeek,
            hasValidPicks
          });
          console.log(`   ⚠️  ISSUE: Eliminated without elimination week!`);
        } else if (eliminated && eliminatedWeek && hasValidPicks) {
          // Need to verify if elimination was correct
          issues.push({
            userId,
            issue: 'NEEDS_VERIFICATION',
            eliminated,
            eliminatedWeek,
            hasValidPicks
          });
          console.log(`   🔍 NEEDS VERIFICATION: Eliminated in week ${eliminatedWeek}`);
        } else {
          validUsers.push({
            userId,
            eliminated,
            eliminatedWeek,
            hasValidPicks
          });
          console.log(`   ✅ Status appears correct`);
        }

      } catch (error) {
        console.error(`Error processing ${file}:`, error.message);
      }
    }
  });

  console.log('\n📋 SUMMARY REPORT');
  console.log('=================');
  console.log(`Total users analyzed: ${files.length}`);
  console.log(`Users with issues: ${issues.length}`);
  console.log(`Valid users: ${validUsers.length}`);

  if (issues.length > 0) {
    console.log('\n🚨 USERS WITH ISSUES:');
    issues.forEach(issue => {
      console.log(`${issue.userId}: ${issue.issue}`);
    });

    // Save issues for batch fix script
    fs.writeFileSync('elimination_issues.json', JSON.stringify(issues, null, 2));
    console.log('\n💾 Issues saved to: elimination_issues.json');
  }

} else {
  console.log('No user data directory found');
}
EOF

# Run the analysis
node analyze_eliminations.js

echo ""
echo "📊 STEP 4: Generate Fix Commands"
echo "==============================="

# Create batch fix script
cat > generate_fixes.js << 'EOF'
const fs = require('fs');

console.log('🔧 GENERATING BATCH FIX COMMANDS');
console.log('=================================');

if (fs.existsSync('elimination_issues.json')) {
  const issues = JSON.parse(fs.readFileSync('elimination_issues.json', 'utf8'));

  const fixCommands = [];

  issues.forEach(issue => {
    if (issue.issue === 'ELIMINATED_WITHOUT_WEEK') {
      // Fix: Set eliminated to false since no elimination week
      const command = `firebase firestore:update "artifacts/nerdfootball/public/data/nerd_survivor/${issue.userId}" eliminated=false`;
      fixCommands.push(command);
      console.log(`FIX: ${issue.userId} - Remove elimination status (no week specified)`);
    }
  });

  if (fixCommands.length > 0) {
    // Save fix commands to script
    const scriptContent = '#!/bin/bash\n\n# Batch fix commands for survivor elimination issues\n\n' +
                         fixCommands.join('\n') + '\n';

    fs.writeFileSync('batch_fix_commands.sh', scriptContent);
    console.log(`\n💾 ${fixCommands.length} fix commands saved to: batch_fix_commands.sh`);
    console.log('📋 To execute fixes, run: chmod +x batch_fix_commands.sh && ./batch_fix_commands.sh');
  } else {
    console.log('No automatic fixes generated');
  }

} else {
  console.log('No issues file found to process');
}
EOF

node generate_fixes.js

echo ""
echo "📊 STEP 5: Create Verification Commands"
echo "======================================"

cat > verify_fixes.sh << 'EOF'
#!/bin/bash

echo "🔍 VERIFYING SURVIVOR ELIMINATION FIXES"
echo "======================================="

if [ -f "user_ids_list.txt" ]; then
  echo "Re-checking user elimination status..."
  while IFS= read -r user_id; do
    if [ ! -z "$user_id" ]; then
      echo ""
      echo "👤 User: $user_id"
      firebase firestore:get "artifacts/nerdfootball/public/data/nerd_survivor/$user_id" | grep -E "(eliminated|eliminatedWeek)" || echo "No elimination data found"
    fi
  done < user_ids_list.txt
else
  echo "No user list found for verification"
fi
EOF

chmod +x verify_fixes.sh

echo ""
echo "✅ FIREBASE CLI ANALYSIS COMPLETE"
echo "================================="
echo ""
echo "📁 Generated Files:"
echo "  - pool_members_raw.json (pool member data)"
echo "  - user_ids_list.txt (list of user IDs)"
echo "  - survivor_user_data/ (individual user data)"
echo "  - elimination_issues.json (identified issues)"
echo "  - batch_fix_commands.sh (fix commands to run)"
echo "  - verify_fixes.sh (verification script)"
echo ""
echo "🔧 Next Steps:"
echo "1. Review elimination_issues.json to see identified problems"
echo "2. Execute: chmod +x batch_fix_commands.sh && ./batch_fix_commands.sh"
echo "3. Run verification: ./verify_fixes.sh"
echo ""
echo "🚨 IMPORTANT: Review batch_fix_commands.sh before executing!"