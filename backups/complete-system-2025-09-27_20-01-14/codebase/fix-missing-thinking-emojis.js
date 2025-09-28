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

async function fixMissingThinkingEmojis() {
  console.log('🔧 FIXING MISSING THINKING EMOJIS FOR USERS WITH INCOMPLETE PICKS\n');

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

    // 2. Week calculation (same as battlefield logic)
    const seasonStart = new Date('2025-09-04');
    const now = new Date();
    const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 18);
    const currentWeekGamesStarted = false;
    const completedWeeks = currentWeekGamesStarted ? currentWeek : currentWeek - 1;

    console.log(`📅 Week Calculation: Current=${currentWeek}, Completed=${completedWeeks}\n`);

    // 3. Build team to helmet CSS map
    const teamToHelmetMap = {
      'Arizona Cardinals': 'ari', 'Atlanta Falcons': 'atl', 'Baltimore Ravens': 'bal', 'Buffalo Bills': 'buf',
      'Carolina Panthers': 'car', 'Chicago Bears': 'chi', 'Cincinnati Bengals': 'cin', 'Cleveland Browns': 'cle',
      'Dallas Cowboys': 'dal', 'Denver Broncos': 'den', 'Detroit Lions': 'det', 'Green Bay Packers': 'gb',
      'Houston Texans': 'hou', 'Indianapolis Colts': 'ind', 'Jacksonville Jaguars': 'jax', 'Kansas City Chiefs': 'kc',
      'Las Vegas Raiders': 'lv', 'Los Angeles Chargers': 'lac', 'Los Angeles Rams': 'lar', 'Miami Dolphins': 'mia',
      'Minnesota Vikings': 'min', 'New England Patriots': 'ne', 'New Orleans Saints': 'no', 'New York Giants': 'nyg',
      'New York Jets': 'nyj', 'Philadelphia Eagles': 'phi', 'Pittsburgh Steelers': 'pit', 'San Francisco 49ers': 'sf',
      'Seattle Seahawks': 'sea', 'Tampa Bay Buccaneers': 'tb', 'Tennessee Titans': 'ten', 'Washington Commanders': 'was'
    };

    // 4. Process survivor data with FIXED thinking emoji logic
    const activeUsers = [];
    const eliminatedUsers = [];

    console.log('🎯 ANALYZING USERS WITH MISSING THINKING EMOJIS:\n');

    for (const [uid, user] of Object.entries(poolData)) {
      const displayName = user.displayName || user.email || `User ${uid.substring(0, 8)}`;
      const survivor = user.survivor || {};
      const pickHistory = survivor.pickHistory || '';
      const picks = pickHistory.split(', ').filter(pick => pick && pick.trim());
      const isAlive = survivor.alive !== false && !survivor.eliminationWeek;

      // FIXED: Build helmet display with proper thinking emoji logic
      const helmets = [];

      // Generate for each week from 1 to currentWeek
      for (let week = 1; week <= currentWeek; week++) {
        if (week <= picks.length) {
          // User has a pick for this week
          const teamName = picks[week - 1].trim();
          const helmetClass = teamToHelmetMap[teamName] || 'unknown';

          if (week <= completedWeeks) {
            // Visible helmet (completed week)
            helmets.push({
              week,
              team: teamName,
              helmetClass,
              visible: true,
              type: 'helmet',
              title: `Week ${week}: ${teamName}`
            });
          } else {
            // Hidden pick (future week)
            helmets.push({
              week,
              team: teamName,
              helmetClass: '',
              visible: false,
              type: 'thinking',
              title: `Week ${week}: Pick hidden until games start`
            });
          }
        } else {
          // User MISSING pick for this week
          if (week <= completedWeeks) {
            // MISSING pick for COMPLETED week = thinking emoji
            helmets.push({
              week,
              team: null,
              helmetClass: '',
              visible: true,
              type: 'thinking',
              title: `Week ${week}: No pick submitted`
            });
          } else {
            // MISSING pick for FUTURE week = thinking emoji
            helmets.push({
              week,
              team: null,
              helmetClass: '',
              visible: true,
              type: 'thinking',
              title: `Week ${week}: Pick not yet available`
            });
          }
        }
      }

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

      // Log users with missing Week 2 picks
      if (picks.length === 1 && isAlive) {
        console.log(`📊 ${displayName}: 1 pick, should show Week 2 🤔`);
        console.log(`   Week 1: ${picks[0]} (helmet)`);
        console.log(`   Week 2: 🤔 (missing pick for completed week)`);
        console.log(`   Week 3: 🤔 (future week)\n`);
      }
    }

    // 5. Generate HTML with FIXED thinking emoji logic
    console.log('🎨 Generating corrected HTML display...');

    const generateHelmetHTML = (helmets) => {
      return helmets.map(helmet => {
        if (helmet.type === 'helmet' && helmet.visible) {
          return `
                    <div class="helmet-container inline-block" title="${helmet.title}">
                        <div class="helmet ${helmet.helmetClass} opacity-100 " data-team="${helmet.team}" data-week="${helmet.week}">
                        </div>
                    </div>`;
        } else {
          // Always show thinking emoji for missing picks or future weeks
          return `
                    <div class="inline-block" title="${helmet.title}">
                        <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                            🤔
                        </div>
                    </div>`;
        }
      }).join('');
    };

    const generateUserHTML = (user) => {
      const statusEmoji = user.isAlive ? '⭐' : '💀';
      const statusText = user.isAlive ? 'Active' : `Eliminated Week ${user.eliminationWeek}`;
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
<!-- FIXED BATTLEFIELD DISPLAY WITH THINKING EMOJIS - Generated ${timestamp} -->
<!-- Current Week: ${currentWeek}, Completed Weeks: ${completedWeeks} -->
<!-- Active Users: ${activeUsers.length}, Eliminated Users: ${eliminatedUsers.length} -->

<div class="mb-6 bg-blue-50 rounded-lg border border-blue-200 overflow-hidden">
    <div class="bg-blue-100 px-4 py-3 border-b border-blue-200">
        <h3 class="text-lg font-semibold text-blue-900 flex items-center">
            ⭐ Active Survivors (${activeUsers.length})
            <span class="ml-2 text-sm font-normal text-blue-600">Fighting for victory</span>
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

<!-- THINKING EMOJI FIX APPLIED -->
<!-- Users with 1 pick now show Week 2 thinking emoji: ${activeUsers.filter(u => u.totalPicks === 1).length} users -->
<!-- Logic: Missing picks for completed weeks = 🤔 -->
`;

    // 6. Save corrected HTML
    const outputPath = '/Users/tonyweeg/nerdfootball-project/docs/battlefield-THINKING-EMOJI-FIXED.html';
    fs.writeFileSync(outputPath, html);

    console.log(`✅ Corrected battlefield display generated: ${outputPath}\n`);

    // 7. Show summary
    const usersWithMissingWeek2 = activeUsers.filter(u => u.totalPicks === 1);
    console.log('🎯 THINKING EMOJI FIX SUMMARY:');
    console.log(`   Users with 1 pick (missing Week 2): ${usersWithMissingWeek2.length}`);
    console.log(`   These users now show Week 2 🤔 for missing picks`);

    if (usersWithMissingWeek2.length > 0) {
      console.log('\n👁️ USERS NOW SHOWING WEEK 2 THINKING EMOJI:');
      usersWithMissingWeek2.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name}: Week 1 helmet + Week 2 🤔 + Week 3 🤔`);
      });
    }

  } catch (error) {
    console.error('❌ Error fixing thinking emojis:', error);
  }
}

fixMissingThinkingEmojis().then(() => {
  console.log('\n✅ Thinking emoji fix complete');
  process.exit(0);
}).catch(error => {
  console.error('Fix failed:', error);
  process.exit(1);
});