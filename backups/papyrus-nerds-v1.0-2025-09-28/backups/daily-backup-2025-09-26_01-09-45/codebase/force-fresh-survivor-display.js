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

async function forceFreshSurvivorDisplay() {
  console.log('🚀 FORCING FRESH SURVIVOR DISPLAY - ELIMINATING STALE STATIC HTML\n');

  const poolId = 'nerduniverse-2025';

  try {
    // 1. Read FRESH data from the pool members structure we updated
    console.log('📡 Reading FRESH Firebase data from pool members...');
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (!poolDoc.exists()) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();
    console.log(`✅ Loaded ${Object.keys(poolData).length} fresh pool members\n`);

    // 2. Check our key users to confirm they have 2 weeks of picks
    const keyUsers = [
      { name: 'Wholeeoh', uid: 'Ym8yukuU84ddcP6q5WRVMfdaKME3' },
      { name: 'Trae Anderson', uid: '30bXFADO8jaFIQTHxSj7Qi2YSRi2' }
    ];

    console.log('🔍 VERIFYING KEY USERS HAVE FRESH DATA:');
    console.log('=====================================');

    keyUsers.forEach(keyUser => {
      const userData = poolData[keyUser.uid];
      if (userData && userData.survivor) {
        const pickHistory = userData.survivor.pickHistory || '';
        const picks = pickHistory.split(', ').filter(p => p && p.trim());
        const isAlive = userData.survivor.alive !== false && !userData.survivor.eliminationWeek;

        console.log(`👤 ${keyUser.name}:`);
        console.log(`   Pick History: "${pickHistory}"`);
        console.log(`   Total Picks: ${picks.length}`);
        console.log(`   Week 1: ${picks[0] || 'MISSING'}`);
        console.log(`   Week 2: ${picks[1] || 'MISSING'}`);
        console.log(`   Status: ${isAlive ? '⭐ ACTIVE' : '💤 ELIMINATED'}`);
        console.log(`   Expected: ⭐ ACTIVE with 2 picks`);
        console.log(`   Correct: ${picks.length === 2 && isAlive ? '✅ YES' : '❌ NO'}`);
        console.log('');
      }
    });

    // 3. Week calculation
    const seasonStart = new Date('2025-09-04');
    const now = new Date();
    const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 18);
    const completedWeeks = 2; // Week 1 and 2 are completed

    console.log(`📅 Week Calculation: Current=${currentWeek}, Completed=${completedWeeks}\n`);

    // 4. Team to helmet mapping
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

    // 5. Generate FRESH survivor display with CORRECT elimination logic
    const activeUsers = [];
    const eliminatedUsers = [];

    console.log('🎨 GENERATING FRESH SURVIVOR DISPLAY WITH CORRECT DATA:');
    console.log('======================================================');

    for (const [uid, user] of Object.entries(poolData)) {
      const displayName = user.displayName || user.email || `User ${uid.substring(0, 8)}`;
      const survivor = user.survivor || {};
      const pickHistory = survivor.pickHistory || '';
      const picks = pickHistory.split(', ').filter(pick => pick && pick.trim());
      const isAlive = survivor.alive !== false && !survivor.eliminationWeek;
      const eliminationWeek = survivor.eliminationWeek;

      // Skip users with no picks
      if (picks.length === 0) continue;

      // Build helmet display with CORRECT logic
      const helmets = [];

      for (let week = 1; week <= currentWeek; week++) {
        if (week <= picks.length) {
          // User has a pick for this week
          const teamName = picks[week - 1].trim();
          const helmetClass = teamToHelmetMap[teamName] || 'unknown';

          if (week <= completedWeeks) {
            // Completed week - show helmet
            let helmetStyle = 'opacity-100';
            let helmetTitle = `Week ${week}: ${teamName}`;

            // CRITICAL FIX: Only show elimination helmet for actual elimination week
            if (!isAlive && eliminationWeek === week) {
              helmetStyle = 'opacity-50 ring-2 ring-red-400';
              helmetTitle = `Week ${week}: ${teamName} (💤 Elimination)`;
            }

            helmets.push({
              week,
              team: teamName,
              helmetClass,
              style: helmetStyle,
              title: helmetTitle,
              type: 'helmet'
            });
          } else {
            // Future week - hidden pick (thinking emoji)
            helmets.push({
              week,
              team: null,
              type: 'thinking',
              title: `Week ${week}: Pick hidden until games start`
            });
          }
        } else {
          // Missing pick for this week
          helmets.push({
            week,
            team: null,
            type: 'thinking',
            title: `Week ${week}: No pick submitted`
          });
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
        eliminationWeek: eliminationWeek || null
      };

      if (isAlive) {
        activeUsers.push(userData);
      } else {
        eliminatedUsers.push(userData);
      }

      // Log key users for verification
      if (['Wholeeoh', 'Trae Anderson'].some(name => displayName.includes(name))) {
        console.log(`✅ ${displayName}: ${picks.length} picks, ${isAlive ? 'ACTIVE' : 'ELIMINATED'}`);
        console.log(`   Pick History: "${pickHistory}"`);
        console.log(`   Status: ${isAlive ? '⭐ SHOULD SHOW AS ACTIVE' : '💤 ELIMINATED'}`);
      }
    }

    // 6. Generate HTML with FRESH data
    const generateHelmetHTML = (helmets) => {
      return helmets.map(helmet => {
        if (helmet.type === 'helmet') {
          return `
                    <div class="helmet-container inline-block" title="${helmet.title}">
                        <div class="helmet ${helmet.helmetClass} ${helmet.style}" data-team="${helmet.team}" data-week="${helmet.week}">
                        </div>
                    </div>`;
        } else {
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
      const statusEmoji = user.isAlive ? '⭐' : '💤';
      const statusText = user.isAlive ? 'Active' : `Eliminated Week ${user.eliminationWeek}`;
      const borderColor = user.isAlive ? 'border-blue-200' : 'border-slate-300';
      const bgColor = user.isAlive ? 'bg-white' : 'bg-slate-50';
      const textColor = user.isAlive ? 'text-blue-900' : 'text-slate-700';
      const subTextColor = user.isAlive ? 'text-blue-600' : 'text-slate-500';

      return `
            <div class="p-4 ${bgColor} ${borderColor} border-2 rounded-lg hover:shadow-md transition-all duration-200">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="font-semibold ${textColor} truncate flex-1">${user.name}</h4>
                    <span class="text-xl ml-2">${statusEmoji}</span>
                </div>
                <p class="text-sm ${subTextColor} mb-3">${statusText}</p>
                <div class="space-y-2">
                    <div class="text-xs ${subTextColor} font-medium">
                        Pick History (${user.totalPicks} weeks):
                    </div>
                    <div class="flex flex-wrap gap-1">
                        ${generateHelmetHTML(user.helmets)}
                    </div>
                </div>
            </div>`;
    };

    const timestamp = new Date().toISOString();
    const freshHTML = `
<!-- FORCED FRESH SURVIVOR DISPLAY - Generated ${timestamp} -->
<!-- CRITICAL: This overwrites stale static HTML with fresh Firebase data -->
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
<div class="mb-6 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
    <div class="bg-slate-100 px-4 py-3 border-b border-slate-200">
        <h3 class="text-lg font-semibold text-slate-900 flex items-center">
            💤 Eliminated Survivors (${eliminatedUsers.length})
            <span class="ml-2 text-sm font-normal text-slate-600">Fallen warriors</span>
        </h3>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        ${eliminatedUsers.map(generateUserHTML).join('')}
    </div>
</div>
` : ''}

<!-- FRESH DATA VERIFICATION -->
<!-- Wholeeoh: ${activeUsers.find(u => u.name.includes('Wholeeoh'))?.totalPicks || 'NOT FOUND'} picks -->
<!-- Trae Anderson: ${activeUsers.find(u => u.name.includes('Trae'))?.totalPicks || 'NOT FOUND'} picks -->
`;

    // 7. Overwrite ALL static HTML files with fresh data
    const staticFiles = [
      '/Users/tonyweeg/nerdfootball-project/docs/battlefied.html',
      '/Users/tonyweeg/nerdfootball-project/docs/battlefield-ELIMINATION-LOGIC-FIXED.html'
    ];

    staticFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, freshHTML);
        console.log(`✅ Overwrote stale static file: ${filePath}`);
      }
    });

    // 8. Summary
    const wholeeohUser = activeUsers.find(u => u.name.includes('Wholeeoh'));
    const traeUser = activeUsers.find(u => u.name.includes('Trae'));

    console.log('\n🎯 FRESH DISPLAY GENERATION COMPLETE:');
    console.log('====================================');
    console.log(`✅ Active users: ${activeUsers.length}`);
    console.log(`✅ Eliminated users: ${eliminatedUsers.length}`);
    console.log(`✅ Wholeeoh: ${wholeeohUser ? `${wholeeohUser.totalPicks} picks, ACTIVE` : 'NOT FOUND'}`);
    console.log(`✅ Trae Anderson: ${traeUser ? `${traeUser.totalPicks} picks, ACTIVE` : 'NOT FOUND'}`);
    console.log('');
    console.log('🚀 STALE STATIC HTML ELIMINATED - FRESH DATA NOW SERVED!');

  } catch (error) {
    console.error('❌ Error forcing fresh survivor display:', error);
  }
}

forceFreshSurvivorDisplay().then(() => {
  console.log('\n✅ Fresh survivor display generation complete');
  process.exit(0);
}).catch(error => {
  console.error('Fresh display generation failed:', error);
  process.exit(1);
});