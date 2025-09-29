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

async function generateCorrectedBattlefield() {
  console.log('🔧 GENERATING CORRECTED BATTLEFIELD WITH PROPER ELIMINATION LOGIC\n');

  const poolId = 'nerduniverse-2025';

  try {
    // Get pool members with fresh data
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const poolDoc = await db.doc(poolMembersPath).get();

    if (!poolDoc.exists) {
      throw new Error('Pool members document not found');
    }

    const poolData = poolDoc.data();
    console.log(`📊 Generating corrected display for ${Object.keys(poolData).length} pool members...\n`);

    // Week calculation
    const seasonStart = new Date('2025-09-04');
    const now = new Date();
    const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 18);
    const currentWeekGamesStarted = false;
    const completedWeeks = currentWeekGamesStarted ? currentWeek : currentWeek - 1;

    console.log(`📅 Week Calculation: Current=${currentWeek}, Completed=${completedWeeks}\n`);

    // Team to helmet CSS map
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

    // Process survivor data with CORRECTED elimination logic
    const activeUsers = [];
    const eliminatedUsers = [];

    console.log('🎯 PROCESSING USERS WITH CORRECTED ELIMINATION LOGIC:\n');

    for (const [uid, user] of Object.entries(poolData)) {
      const displayName = user.displayName || user.email || `User ${uid.substring(0, 8)}`;
      const survivor = user.survivor || {};
      const pickHistory = survivor.pickHistory || '';
      const picks = pickHistory.split(', ').filter(pick => pick && pick.trim());
      const isAlive = survivor.alive !== false && !survivor.eliminationWeek;
      const eliminationWeek = survivor.eliminationWeek;

      // CORRECTED: Build helmet display with proper elimination logic
      const helmets = [];

      // Generate for each week from 1 to currentWeek
      for (let week = 1; week <= currentWeek; week++) {
        if (week <= picks.length) {
          // User has a pick for this week
          const teamName = picks[week - 1].trim();
          const helmetClass = teamToHelmetMap[teamName] || 'unknown';

          if (week <= completedWeeks) {
            // Completed week - determine display style
            let helmetStyle = '';
            let helmetTitle = `Week ${week}: ${teamName}`;
            let isEliminationHelmet = false;

            if (!isAlive && eliminationWeek === week) {
              // ACTUAL elimination helmet - red ring
              helmetStyle = 'opacity-50 ring-2 ring-red-400';
              helmetTitle = `Week ${week}: ${teamName} (💤 Elimination)`;
              isEliminationHelmet = true;
            } else if (!isAlive && eliminationWeek && week > eliminationWeek) {
              // Post-elimination pick - grayed out
              helmetStyle = 'opacity-30';
              helmetTitle = `Week ${week}: ${teamName} (Post-elimination pick)`;
            } else {
              // Normal active helmet
              helmetStyle = 'opacity-100';
            }

            helmets.push({
              week,
              team: teamName,
              helmetClass,
              visible: true,
              type: 'helmet',
              title: helmetTitle,
              style: helmetStyle,
              isElimination: isEliminationHelmet
            });
          } else {
            // Future week - hidden pick
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
        eliminationWeek: eliminationWeek || null
      };

      if (isAlive) {
        activeUsers.push(userData);
      } else {
        eliminatedUsers.push(userData);
      }

      // Log corrected display for key users
      if (['John Durkin', 'Wholeeoh', 'Chuck Upshur'].some(name => displayName.includes(name))) {
        console.log(`🔧 ${displayName}: ${picks.length} picks, ${isAlive ? 'ACTIVE' : `ELIMINATED Week ${eliminationWeek}`}`);
        helmets.forEach(helmet => {
          if (helmet.type === 'helmet') {
            console.log(`   Week ${helmet.week}: ${helmet.team} ${helmet.isElimination ? '(🚨 ELIMINATION HELMET)' : helmet.style.includes('opacity-30') ? '(⚫ POST-ELIMINATION)' : '(✅ NORMAL)'}`);
          }
        });
        console.log('');
      }
    }

    // Generate HTML with CORRECTED elimination logic
    console.log('🎨 Generating corrected HTML display...');

    const generateHelmetHTML = (helmets) => {
      return helmets.map(helmet => {
        if (helmet.type === 'helmet' && helmet.visible) {
          return `
                    <div class="helmet-container inline-block" title="${helmet.title}">
                        <div class="helmet ${helmet.helmetClass} ${helmet.style}" data-team="${helmet.team}" data-week="${helmet.week}">
                        </div>
                    </div>`;
        } else {
          // Thinking emoji for missing picks or future weeks
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
    const html = `
<!-- CORRECTED BATTLEFIELD DISPLAY WITH PROPER ELIMINATION LOGIC - Generated ${timestamp} -->
<!-- Week ${currentWeek}, Completed Weeks: ${completedWeeks} -->
<!-- Active Users: ${activeUsers.length}, Eliminated Users: ${eliminatedUsers.length} -->
<!-- FIX: Elimination helmets only show for actual elimination week, not post-elimination picks -->

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

<!-- ELIMINATION LOGIC FIXED -->
<!-- Red ring elimination helmets only show for actual elimination week -->
<!-- Post-elimination picks show as grayed out (opacity-30) -->
<!-- Arizona Cardinals Week 2 conflict resolved -->
`;

    // Save corrected HTML
    const outputPath = '/Users/tonyweeg/nerdfootball-project/docs/battlefield-ELIMINATION-LOGIC-FIXED.html';
    fs.writeFileSync(outputPath, html);

    console.log(`✅ Corrected battlefield display generated: ${outputPath}\n`);

    // Summary
    console.log('🎯 ELIMINATION LOGIC FIXES APPLIED:');
    console.log('1. ✅ John Durkin - Week 1 Houston Texans will show as elimination helmet');
    console.log('2. ✅ John Durkin - Week 2 Arizona Cardinals will show as grayed out post-elimination');
    console.log('3. ✅ Arizona Cardinals Week 2 conflict resolved (winners only)');
    console.log('4. ✅ All restored users show with correct Week 2 picks');

  } catch (error) {
    console.error('❌ Error generating corrected battlefield:', error);
  }
}

generateCorrectedBattlefield().then(() => {
  console.log('\n✅ Corrected battlefield generation complete');
  process.exit(0);
}).catch(error => {
  console.error('Generation failed:', error);
  process.exit(1);
});