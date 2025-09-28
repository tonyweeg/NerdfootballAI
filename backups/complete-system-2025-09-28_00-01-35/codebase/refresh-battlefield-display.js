const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function refreshBattlefieldDisplay() {
  console.log('🚀 FORCE REFRESHING BATTLEFIELD DISPLAY WITH CURRENT DATA\n');

  const poolId = 'nerduniverse-2025';

  try {
    // 1. Load current Firebase data
    console.log('📡 Loading current Firebase data...');
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();
    console.log(`✅ Loaded ${Object.keys(poolData).length} pool members\n`);

    // 2. Build team to helmet CSS map (from battlefield display JS)
    const teamToHelmetMap = {
      'Arizona Cardinals': 'ari',
      'Atlanta Falcons': 'atl',
      'Baltimore Ravens': 'bal',
      'Buffalo Bills': 'buf',
      'Carolina Panthers': 'car',
      'Chicago Bears': 'chi',
      'Cincinnati Bengals': 'cin',
      'Cleveland Browns': 'cle',
      'Dallas Cowboys': 'dal',
      'Denver Broncos': 'den',
      'Detroit Lions': 'det',
      'Green Bay Packers': 'gb',
      'Houston Texans': 'hou',
      'Indianapolis Colts': 'ind',
      'Jacksonville Jaguars': 'jax',
      'Kansas City Chiefs': 'kc',
      'Las Vegas Raiders': 'lv',
      'Los Angeles Chargers': 'lac',
      'Los Angeles Rams': 'lar',
      'Miami Dolphins': 'mia',
      'Minnesota Vikings': 'min',
      'New England Patriots': 'ne',
      'New Orleans Saints': 'no',
      'New York Giants': 'nyg',
      'New York Jets': 'nyj',
      'Philadelphia Eagles': 'phi',
      'Pittsburgh Steelers': 'pit',
      'San Francisco 49ers': 'sf',
      'Seattle Seahawks': 'sea',
      'Tampa Bay Buccaneers': 'tb',
      'Tennessee Titans': 'ten',
      'Washington Commanders': 'was'
    };

    // 3. Calculate current week (from battlefield display logic)
    const seasonStart = new Date('2025-09-04');
    const now = new Date();
    const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 18);
    const currentWeekGamesStarted = false; // Assume safer default
    const completedWeeks = currentWeekGamesStarted ? currentWeek : currentWeek - 1;

    console.log(`📅 Week Calculation: Current=${currentWeek}, Completed=${completedWeeks}\n`);

    // 4. Process survivor data
    const activeUsers = [];
    const eliminatedUsers = [];

    for (const [uid, user] of Object.entries(poolData)) {
      const displayName = user.displayName || user.email || `User ${uid.substring(0, 8)}`;
      const survivor = user.survivor || {};
      const pickHistory = survivor.pickHistory || '';
      const picks = pickHistory.split(', ').filter(pick => pick && pick.trim());
      const isAlive = survivor.alive !== false && !survivor.eliminationWeek;

      // Build helmet display (from battlefield display logic)
      const maxPicksToProcess = currentWeek;
      const picksToProcess = picks.slice(0, maxPicksToProcess);
      const helmets = [];

      picksToProcess.forEach((teamName, index) => {
        const week = index + 1;
        const teamTrim = teamName.trim();
        const helmetClass = teamToHelmetMap[teamTrim] || 'unknown';

        if (week <= completedWeeks) {
          // Visible helmet
          helmets.push({
            week,
            team: teamTrim,
            helmetClass,
            visible: true,
            title: `Week ${week}: ${teamTrim}`
          });
        } else {
          // Hidden pick (thinking emoji)
          helmets.push({
            week,
            team: teamTrim,
            helmetClass: '',
            visible: false,
            title: `Week ${week}: Thinking...`
          });
        }
      });

      const userData = {
        uid,
        name: displayName,
        email: user.email || 'No email',
        picks: picks,
        totalPicks: picks.length,
        helmets: helmets,
        isAlive: isAlive,
        eliminationWeek: survivor.eliminationWeek || null
      };

      if (isAlive) {
        activeUsers.push(userData);
      } else {
        eliminatedUsers.push(userData);
      }
    }

    // 5. Generate HTML
    console.log('🎨 Generating fresh HTML display...');

    const generateHelmetHTML = (helmets) => {
      return helmets.map(helmet => {
        if (helmet.visible) {
          return `
                    <div class="helmet-container inline-block" title="${helmet.title}">
                        <div class="helmet ${helmet.helmetClass} opacity-100 " data-team="${helmet.team}" data-week="${helmet.week}">
                        </div>
                    </div>`;
        } else {
          return `
                    <div class="helmet-container inline-block" title="${helmet.title}">
                        <div class="thinking-emoji opacity-100">🤔</div>
                    </div>`;
        }
      }).join('');
    };

    const generateUserHTML = (user) => {
      const statusEmoji = user.isAlive ? '⭐' : '💀';
      const statusText = user.isAlive ? 'Active' : `Eliminated Week ${user.eliminationWeek}`;
      const bgColor = user.isAlive ? 'bg-blue-50' : 'bg-red-50';
      const borderColor = user.isAlive ? 'border-blue-200' : 'border-red-200';
      const textColor = user.isAlive ? 'text-blue-900' : 'text-red-900';

      return `
            <div class="p-4 bg-white ${borderColor} border-2 rounded-lg hover:shadow-md transition-all duration-200">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="font-semibold ${textColor} truncate flex-1">${user.name}</h4>
                    <span class="text-xl ml-2">${statusEmoji}</span>
                </div>
                <p class="text-sm text-blue-600 mb-3">${statusText}</p>
                <div class="space-y-2">
                    <div class="text-xs text-blue-600 font-medium">
                        Pick History (${user.totalPicks} weeks):
                    </div>
                    <div class="flex flex-wrap gap-1">
                        ${generateHelmetHTML(user.helmets)}
                    </div>
                </div>
            </div>`;
    };

    const timestamp = new Date().toISOString();
    const html = `
<!-- FRESH BATTLEFIELD DISPLAY - Generated ${timestamp} -->
<!-- Current Week: ${currentWeek}, Completed Weeks: ${completedWeeks} -->
<!-- Active Users: ${activeUsers.length}, Eliminated Users: ${eliminatedUsers.length} -->

<div class="mb-6 ${activeUsers.length > 0 ? 'bg-blue-50' : 'bg-gray-50'} rounded-lg border ${activeUsers.length > 0 ? 'border-blue-200' : 'border-gray-200'} overflow-hidden">
    <div class="${activeUsers.length > 0 ? 'bg-blue-100' : 'bg-gray-100'} px-4 py-3 border-b ${activeUsers.length > 0 ? 'border-blue-200' : 'border-gray-200'}">
        <h3 class="text-lg font-semibold ${activeUsers.length > 0 ? 'text-blue-900' : 'text-gray-900'} flex items-center">
            ⭐ Active Survivors (${activeUsers.length})
            <span class="ml-2 text-sm font-normal ${activeUsers.length > 0 ? 'text-blue-600' : 'text-gray-600'}">Fighting for victory</span>
        </h3>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        ${activeUsers.map(generateUserHTML).join('')}
    </div>
</div>

${eliminatedUsers.length > 0 ? `
<div class="mb-6 bg-red-50 rounded-lg border border-red-200 overflow-hidden">
    <div class="bg-red-100 px-4 py-3 border-b border-red-200">
        <h3 class="text-lg font-semibold text-red-900 flex items-center">
            💀 Eliminated Survivors (${eliminatedUsers.length})
            <span class="ml-2 text-sm font-normal text-red-600">Fallen warriors</span>
        </h3>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        ${eliminatedUsers.map(generateUserHTML).join('')}
    </div>
</div>
` : ''}

<!-- FRESH DATA VERIFICATION -->
<!-- Users with 2+ picks who should show Week 2 helmets: ${activeUsers.filter(u => u.totalPicks >= 2).length} -->
<!-- Week 2 should be visible: ${completedWeeks >= 2 ? 'YES' : 'NO'} -->
`;

    // 6. Save fresh HTML
    const outputPath = '/Users/tonyweeg/nerdfootball-project/docs/battlefield-FRESH.html';
    fs.writeFileSync(outputPath, html);

    console.log(`✅ Fresh battlefield display generated: ${outputPath}\n`);

    // 7. Show summary
    console.log('📊 FRESH BATTLEFIELD SUMMARY:');
    console.log(`   Total users: ${Object.keys(poolData).length}`);
    console.log(`   Active: ${activeUsers.length}`);
    console.log(`   Eliminated: ${eliminatedUsers.length}`);
    console.log(`   Users with 2+ picks: ${activeUsers.filter(u => u.totalPicks >= 2).length}`);
    console.log(`   Week 2 helmets should be visible: ${completedWeeks >= 2 ? 'YES' : 'NO'}`);

    // 8. List users with Week 2 picks
    const usersWithWeek2 = activeUsers.filter(u => u.totalPicks >= 2);
    if (usersWithWeek2.length > 0) {
      console.log(`\n👁️ USERS WHO SHOULD SHOW WEEK 2 HELMETS (${usersWithWeek2.length}):`);
      usersWithWeek2.forEach((user, index) => {
        const week2Pick = user.picks[1] || 'Unknown';
        console.log(`   ${index + 1}. ${user.name}: Week 2 = ${week2Pick}`);
      });
    }

    console.log(`\n🎯 Compare fresh display vs outdated docs/battlefied.html`);
    console.log(`   Fresh file: ${outputPath}`);
    console.log(`   Old file: /Users/tonyweeg/nerdfootball-project/docs/battlefied.html`);

  } catch (error) {
    console.error('❌ Error refreshing battlefield display:', error);
  }
}

refreshBattlefieldDisplay().then(() => {
  console.log('\n✅ Battlefield display refresh complete');
  process.exit(0);
}).catch(error => {
  console.error('Battlefield refresh failed:', error);
  process.exit(1);
});