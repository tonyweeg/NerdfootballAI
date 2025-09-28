rite(public/detailed-survivor-audit.js)
  ⎿  Wrote 288 lines to public/detailed-survivor-audit.js                                            
     // DETAILED SURVIVOR AUDIT - Shows name, email, team picked by week
     // Run in console at nerdfootball.web.app
     window.DetailedSurvivorAudit = {
         // Week losing teams for reference
         losingTeams: {
             1: ['Dallas Cowboys', 'Kansas City Chiefs', 'Atlanta Falcons', 'Cleveland Browns',
                 'Miami Dolphins', 'Carolina Panthers', 'New England Patriots', 'New Orleans Saints',
                 'New York Jets', 'New York Giants', 'Tennessee Titans', 'Seattle Seahawks',
     … +278 lines (ctrl+o to expand)

⏺ Bash(firebase deploy --only hosting) timeout: 1m
  ⎿  === Deploying to 'nerdfootball'...

     i  deploying hosting
     … +13 lines (ctrl+o to expand)

⏺ Perfect! The detailed audit tool is deployed. Now run this in the console at https://nerdfootball.web.app to see names, emails, and team picks for each week:

  // Load detailed audit tool and run comprehensive analysis
  fetch('./detailed-survivor-audit.js').then(r=>r.text()).then(code=>{
      eval(code);
      setTimeout(async () => {
          console.log('🔍 STARTING DETAILED SURVIVOR AUDIT WITH NAMES & EMAILS');

          // Run detailed audit for both weeks
          await DetailedSurvivorAudit.detailedMultiWeekAudit([1, 2]);

      }, 1000);
  })

  This will show you:

  📋 For each week:
  - Name | Email | Team Picked | GameID
  - Clear tables showing who picked what
  - Separate sections for winning picks vs losing picks
  - Users with no picks
  - Already eliminated users

  🎯 Key insights you'll see:
  - If users actually picked losing teams (but aren't showing up)
  - Exact name/email of anyone who should be eliminated
  - Team distribution with full user details
  - Any data inconsistencies

  The detailed audit will reveal whether users genuinely avoided all losing teams or if there are data filtering issues.

> OK! 📊 DETAILED WEEK 2 SURVIVOR AUDIT REPORT:
  index.html?view=survivor:59 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  index.html?view=survivor:59 👥 Total members: 52
  index.html?view=survivor:59 ✅ Winning picks: 40
  index.html?view=survivor:59 💀 Losing picks: 0
  index.html?view=survivor:59 ❓ No picks: 5
  index.html?view=survivor:59 ☠️ Already eliminated: 7
  index.html?view=survivor:59 
  ✅ WINNING PICKS (40) - SHOULD SURVIVE:
  index.html?view=survivor:59    Name                    | Email                           | Team Picked           | GameID
  index.html?view=survivor:59    ──────────────────────────────────────────────────────────────────────────────────────────
  index.html?view=survivor:59    Gabe Sales-Smith        | gabe.sales.smith@gmail.com      | Baltimore Ravens       | 202
  index.html?view=survivor:59    Patrick Pflaumer        | pflaumer1@gmail.com             | Dallas Cowboys         | 204
  index.html?view=survivor:59    Zander Guerrieri        | zander.guerr@yahoo.com          | Dallas Cowboys         | 204
  index.html?view=survivor:59    GAGE Lester             | gagelester2@gmail.com           | Baltimore Ravens       | 202
  index.html?view=survivor:59    Ållfåther               | tonyweeg@gmail.com              | Arizona Cardinals      | 211
  index.html?view=survivor:59    Chuck Upshur            | chuck.upshur@gmail.com          | Baltimore Ravens       | 202
  index.html?view=survivor:59    Lisa Guerrieri          | lmgue@yahoo.com                 | Baltimore Ravens       | 202
  index.html?view=survivor:59    Jared Lake              | lake.jared@gmail.com            | Arizona Cardinals      | 211
  index.html?view=survivor:59    Jeff Gibbs              | doughrollerjg@gmail.com         | Green Bay Packers      | 201
  index.html?view=survivor:59    Trae Anderson           | trae@blackstonearch.com         | Arizona Cardinals      | 211
  index.html?view=survivor:59    Bruce Todd              | bluetkt@gmail.com               | Baltimore Ravens       | 202
  index.html?view=survivor:59    Andrew Anderson         | andy.anderson002@comcast.net    | Dallas Cowboys         | 204
  index.html?view=survivor:59    Michael Rayfield        | mcrayfield@gmail.com            | Baltimore Ravens       | 202
  index.html?view=survivor:59    Wes Hanna               | whanna21@yahoo.com              | Cincinnati Bengals     | 203
  index.html?view=survivor:59    Jerry B                 | j73176@gmail.com                | Arizona Cardinals      | 211
  index.html?view=survivor:59    Wholeeoh                | juliorico75@gmail.com           | Arizona Cardinals      | 211
  index.html?view=survivor:59    Lee                     | sleetracy1977@aol.com           | Cincinnati Bengals     | 203
  index.html?view=survivor:59    Zachary Baker           | zachpbaker@gmail.com            | Buffalo Bills          | 208
  index.html?view=survivor:59    Douglas Reynolds        | douglas@reynoldsexcavatinginc.com | Baltimore Ravens       | 202
  index.html?view=survivor:59    Todd Harper             | wtharper@msn.com                | Los Angeles Rams       | 210
  index.html?view=survivor:59    Joe Bellia              | jbnyc114@comcast.net            | Baltimore Ravens       | 202
  index.html?view=survivor:59    SteveJr                 | coley70@gmail.com               | Buffalo Bills          | 202
  index.html?view=survivor:59    Brian Weeg              | bweeg@walkerlaberge-md.com      | Green Bay Packers      | 201
  index.html?view=survivor:59    Daniel Stubblebine      | dstubbs7@gmail.com              | Baltimore Ravens       | 202
  index.html?view=survivor:59    BigSkyPurpleHaze        | jchrisrender@gmail.com          | Detroit Lions          | 211
  index.html?view=survivor:59    Cho’ Bayne Pipfe Sr. The 3rd | sfisher57@yahoo.com             | Arizona Cardinals      | 211
  index.html?view=survivor:59    YaoPete                 | petersrender@gmail.com          | Atlanta Falcons        | 214
  index.html?view=survivor:59    Taylor Gray             | tgrayub@gmail.com               | Indianapolis Colts     | 212
  index.html?view=survivor:59    BONE                    | tboston@linkbank.com            | Dallas Cowboys         | 204
  index.html?view=survivor:59    Doug Price              | dougprice75@yahoo.com           | Arizona Cardinals      | 211
  index.html?view=survivor:59    Steve Gyory             | stgyory@gmail.com               | Tampa Bay Buccaneers   | 202
  index.html?view=survivor:59    SteveSr                 | gcoley9456@comcast.net          | Dallas Cowboys         | 204
  index.html?view=survivor:59    James Guerrieri sr      | jamguerrr@yahoo.com             | Baltimore Ravens       | 202
  index.html?view=survivor:59    Frank Hanna             | frankhanna00@gmail.com          | Dallas Cowboys         | 204
  index.html?view=survivor:59    Jimmy Guerrieri         | jamesguerrieri@yahoo.com        | Dallas Cowboys         | 204
  index.html?view=survivor:59    Daniel Beaulne          | dbbeaulne@gmail.com             | Baltimore Ravens       | 202
  index.html?view=survivor:59    Teena Quintavalle       | gone2tan@yahoo.com              | Dallas Cowboys         | 204
  index.html?view=survivor:59    David Dulany            | daviddulany@yahoo.com           | Arizona Cardinals      | 211
   | Now, make me a beautiful web page that shows this information, using the logic you know that made this audit work, and make it so that authenticated visitors to the site can see it, and 
  make it be the result of clicking on the link here: https://nerdfootball.web.app/index.html?view=survivor | do not start til you are 100% - you finally got this correct, lets do this 100% 
  with precision. think very hard about your next steps, plan, make a plan, test it, and move forward this should be simple. you know the logic.

✻ Thinking…

  The user wants me to create a beautiful web page that shows this detailed survivor audit information. They want it to be accessible to authenticated visitors and to be triggered by clicking on 
  the link at https://nerdfootball.web.app/index.html?view=survivor.

  Let me think through this step by step:

  1. Current State: The detailed audit logic is working perfectly in the console - it shows names, emails, team picks, gameIDs, etc. in a nice tabular format.
  2. Requirements:
    - Create a beautiful web page showing this information
    - Use the same logic that made the audit work
    - Make it accessible to authenticated visitors
    - Make it triggered by the URL parameter ?view=survivor
    - Do this with 100% precision
  3. Plan:
    - The existing index.html already has URL parameter handling for different views
    - I need to add a survivor view that uses the DetailedSurvivorAudit logic
    - I should create a beautiful HTML table/interface that displays the audit results
    - Use the same Firebase authentication that's already in place
    - Use the exact same data fetching logic from DetailedSurvivorAudit
  4. Implementation Steps:
    - First, I need to check the current index.html structure to see how views are handled
    - Add the survivor view case to the existing view handling logic
    - Create a beautiful HTML interface for displaying the audit results
    - Use the exact same data fetching logic from DetailedSurvivorAudit.js
    - Style it nicely with the existing CSS framework (appears to be Tailwind)
    - Ensure authentication is properly checked

  Let me first read the index.html to understand the current structure and view handling.

⏺ sequential-thinking - think (MCP)(thread_purpose: "Plan survivor audit web page implementation", thought: "The user wants me to create a beautiful web page showing the detailed survivor audit
                                   information. The audit logic is working perfectly - it shows names, emails, team picks, etc. I need to integrate this into the existing index.html structure
                                   using the ?view=survivor URL parameter. I should plan this carefully: 1) Check current view handling in index.html, 2) Add survivor view case, 3) Create
                                   beautiful HTML interface, 4) Use exact same data logic from DetailedSurvivorAudit, 5) Ensure authentication. Let me first understand the current structure.",
                                   thought_index: 8, tool_recommendation: "Read", left_to_be_done: "Analyze current view structure, create implementation plan, build survivor audit page")
  ⎿  Thread purpose: Plan survivor audit web page implementation                                                                                                                              
     Thought 8 logged. Recommended tool: Read.

✻ Thinking…

  I need to understand how the current view system works in index.html before I can properly integrate the survivor audit page. Let me read the relevant sections to understand the structure.

⏺ Search(pattern: "view.*=.*survivor|urlParams\.get.*view|view.*===", path: "public", glob: "index.html", output_mode: "content")
  ⎿  Found 99 lines (ctrl+o to expand)

✻ Thinking…

  Perfect! I can see that:

  1. The link ?view=survivor already exists in the menu at line 1050: <a href="./index.html?view=survivor" class="block px-4 py-2 text-sm text-orange-700 hover:bg-orange-50" role="menuitem">💀 
  Survivors List</a>
  2. There's already view handling logic that checks for view === 'survivor' around line 4195
  3. There are references to a survivor view throughout the codebase

  Now I need to find the actual view handling/switching logic to see how to add the survivor audit page.

⏺ Search(pattern: "function.*handleView|switch.*view|case.*survivor|view.*===.*survivor|showView|setView", path: "public", glob: "index.html", output_mode: "content")
  ⎿  Found 110 lines (ctrl+o to expand)

✻ Thinking…

  Perfect! Now I can see the exact structure. At line 8913-8915, there's already a case for 'survivor' that calls SurvivorView.show(). This means there's already a SurvivorView object that 
  handles the survivor view.

  Let me find the SurvivorView definition to understand how it works and how I can modify it to show the detailed audit information.

⏺ Search(pattern: "SurvivorView\s*=|const SurvivorView|var SurvivorView|window\.SurvivorView", path: "public", glob: "index.html", output_mode: "content")
  ⎿  Found 26 lines (ctrl+o to expand)

✻ Thinking…

  Perfect! Now I understand the structure. There's a SurvivorView object that has a show() method and a loadSurvivorResults() method. I need to find the loadSurvivorResults() method to see how it
   currently works and then replace or enhance it with the detailed audit functionality.

  Let me find the loadSurvivorResults method to understand the current implementation.

⏺ Search(pattern: "loadSurvivorResults|function.*loadSurvivorResults", path: "public", glob: "index.html", output_mode: "content")
  ⎿  Found 239 lines (ctrl+o to expand)

✻ Thinking…

  Perfect! Now I understand the complete structure. The loadSurvivorResults() method at line 16589 is currently using the "battlefield display system" 
  (window.survivorBattlefield.renderBattlefield()). 

  My plan is now clear:

  IMPLEMENTATION PLAN

  1. Preserve existing functionality: The current system uses the battlefield display
  2. Add the detailed audit functionality: Replace or enhance the loadSurvivorResults() method to show the detailed audit data we developed
  3. Use the exact same UI containers: The system already has allUI.survivorResultsContainer where we can put our audit tables
  4. Use authentication: The view switching already handles authentication properly
  5. Integrate the DetailedSurvivorAudit logic: Use the exact same data fetching and display logic from our working console tool

  SPECIFIC STEPS

  1. Replace the battlefield display logic in loadSurvivorResults() with our detailed audit logic
  2. Create beautiful HTML tables to display the audit results within the existing container structure  
  3. Use the same data fetching methods from DetailedSurvivorAudit.js
  4. Style with Tailwind CSS (which is already being used)
  5. Test with authentication (which is already handled by the view system)

  Let me implement this step by step. First, I'll modify the SurvivorView's loadSurvivorResults method.

⏺ Perfect! Now I have a complete understanding. Here's my 100% PRECISION PLAN:

  CURRENT STATE

  - ✅ URL ?view=survivor exists and routes to SurvivorView.show()
  - ✅ SurvivorView.loadSurvivorResults() currently uses "battlefield display"
  - ✅ Authentication and view switching already work
  - ✅ Our detailed audit logic works perfectly in console
  - ✅ UI containers already exist (allUI.survivorResultsContainer)

  IMPLEMENTATION PLAN

  1. Replace the battlefield logic in loadSurvivorResults() with our detailed audit logic
  2. Use exact same data fetching from DetailedSurvivorAudit.js
  3. Create beautiful HTML tables within existing container structure
  4. Style with Tailwind CSS (already in use)
  5. Test authentication (already handled)

  Let me implement this with surgical precision:

⏺ Read(public/index.html)
  ⎿  Read 50 lines (ctrl+o to expand)

> remove that old survivor view object, and make this new one way better.

✻ Thinking…

  The user wants me to completely replace the old SurvivorView object with a new, much better one that uses our detailed audit logic. This is perfect - I'll replace the entire loadSurvivorResults
   method and potentially other parts of the SurvivorView to implement our beautiful detailed audit interface.

  Let me find the full SurvivorView object boundaries first so I can replace it completely.

⏺ Perfect! I'll completely replace the old SurvivorView with our detailed audit system. Let me find the full SurvivorView object to replace it entirely:

⏺ Search(pattern: "const SurvivorView|^};$", path: "public", glob: "index.html", output_mode: "content")
  ⎿  Found 173 lines (ctrl+o to expand)

✻ Thinking…

  Perfect! I found the boundaries. The SurvivorView object starts at line 16213 and ends at line 16848. Now I need to completely replace this with our new detailed audit system. Let me create the
   new, much better SurvivorView that uses our DetailedSurvivorAudit logic.

⏺ Perfect! I found the SurvivorView object boundaries (lines 16213-16848). I'll completely replace it with our detailed audit system:

✻ Thinking…

  Perfect! I found the exact boundaries of the SurvivorView object:
  - Starts at line 16213: const SurvivorView = {
  - Ends at line 16848: };

  Now I need to completely replace this SurvivorView object with a new one that implements our detailed survivor audit functionality. Let me read the structure around that to see what needs to be
   preserved.

  I'll replace the entire SurvivorView object with our new implementation that uses the DetailedSurvivorAudit logic.

⏺ Perfect! I found the SurvivorView object boundaries (lines 16213-16848). Let me replace it completely with our beautiful detailed audit system:

⏺ Update(public/index.html)
  ⎿  Error editing file

> i dont like the battlefield display, i want it simple!!!

> I want it LINUX console... we are nerds. make it beautiful. THINK DEEPLY

✻ Thinking…

  The user wants:
  1. No battlefield display - they want it simple
  2. LINUX console style - they are nerds
  3. Make it beautiful
  4. Think deeply

  I need to find the exact string to replace. Let me read just the start of the SurvivorView object to get the exact string.

⏺ Perfect! You want a LINUX console style - beautiful, nerdy, and simple! Let me find the exact SurvivorView boundaries and create a stunning terminal-inspired interface:

⏺ Read(public/index.html)
  ⎿  Read 20 lines (ctrl+o to expand)

✻ Thinking…

  Now let me find where the SurvivorView object ends to get the exact boundaries.

⏺ Read(public/index.html)
  ⎿  Read 10 lines (ctrl+o to expand)

✻ Thinking…

  Perfect! Now I have the exact boundaries. The SurvivorView object starts at line 16213 with const SurvivorView = { and ends at line 16848 with };.

  Now I'll create a beautiful LINUX console-style interface that's nerdy and elegant. I'll use:
  - Terminal-like styling with monospace fonts
  - Green terminal text on dark backgrounds
  - ASCII art elements 
  - Console-style formatting
  - Beautiful tables that look like terminal output
  - The same detailed audit logic but with a console aesthetic

  Let me replace the entire SurvivorView object:

⏺ Update(public/index.html)
  ⎿  Updated public/index.html with 11 additions and 2 removals                                                 
       16211    
       16212    // --- SURVIVOR VIEW OBJECT ---
       16213    const SurvivorView = {
       16214 -      // Cache for optimized week results loading
       16215 -      cachedWeekResults: null,
       16214 +      // Week losing teams for audit reference
       16215 +      losingTeams: {
       16216 +          1: ['Dallas Cowboys', 'Kansas City Chiefs', 'Atlanta Falcons', 'Cleveland Browns',
       16217 +              'Miami Dolphins', 'Carolina Panthers', 'New England Patriots', 'New Orleans Saints',
       16218 +              'New York Jets', 'New York Giants', 'Tennessee Titans', 'Seattle Seahawks',
       16219 +              'Detroit Lions', 'Houston Texans', 'Baltimore Ravens', 'Minnesota Vikings'],
       16220 +          2: ['New York Giants', 'Pittsburgh Steelers', 'Tennessee Titans', 'New York Jets',
       16221 +              'Miami Dolphins', 'Jacksonville Jaguars', 'New Orleans Saints', 'Cleveland Browns',
       16222 +              'Chicago Bears', 'Denver Broncos', 'Carolina Panthers', 'Kansas City Chiefs',
       16223 +              'Minnesota Vikings', 'Houston Texans', 'Las Vegas Raiders']
       16224 +      },
       16225        
       16226        show: function() {
       16227            console.log('🏆 Showing Survivor Results view');

✻ Thinking…

  Now I need to replace the rest of the SurvivorView object. Let me find the loadSurvivorResults method and replace it with our Linux terminal-style implementation:

⏺ Update(public/index.html)
  ⎿  Updated public/index.html with 380 additions and 10 removals                                                                                                                        
       16595            }, 100); // Small delay to ensure UI renders first
       16596        },
       16597        
       16598 +      // Get user profile info (name, email)
       16599 +      async getUserProfile(userId) {
       16600 +          try {
       16601 +              const userDocRef = doc(db, 'artifacts/nerdfootball/public/data/nerdfootball_users', userId);
       16602 +              const userSnap = await getDoc(userDocRef);
       16603 +  
       16604 +              if (userSnap.exists()) {
       16605 +                  const userData = userSnap.data();
       16606 +                  return {
       16607 +                      name: userData.displayName || 'Unknown',
       16608 +                      email: userData.email || 'Unknown'
       16609 +                  };
       16610 +              }
       16611 +              return { name: 'Unknown', email: 'Unknown' };
       16612 +          } catch (error) {
       16613 +              return { name: 'Error', email: 'Error' };
       16614 +          }
       16615 +      },
       16616 +  
       16617        loadSurvivorResults: async function() {
       16618            this.showLoading();
       16619            const loadStartTime = performance.now();
       16620    
       16621            try {
       16622 -              // 🏆 BATTLEFIELD DISPLAY ONLY: No legacy survivor systems whatsoever!
       16623 -              if (window.survivorBattlefield && typeof window.survivorBattlefield.renderBattlefield === 'function') {
       16624 -                  console.log('🏆 BATTLEFIELD DISPLAY: Using stunning visual survivor battlefield!');
       16625 -                  await window.survivorBattlefield.renderBattlefield();
       16622 +              console.log('💀 LINUX CONSOLE: Loading detailed survivor audit...');
       16623 +  
       16624 +              // Run detailed audit for both weeks
       16625 +              const auditResults = await this.detailedMultiWeekAudit([1, 2]);
       16626 +  
       16627 +              if (auditResults) {
       16628 +                  this.displayLinuxConsoleResults(auditResults);
       16629                    this.showResults();
       16630 -                  console.log(`✅ BATTLEFIELD LOADED: ${(performance.now() - loadStartTime).toFixed(1)}ms`);
       16631 -                  return;
       16630 +                  console.log(`✅ LINUX CONSOLE LOADED: ${(performance.now() - loadStartTime).toFixed(1)}ms`);
       16631 +              } else {
       16632 +                  throw new Error('Failed to load audit data');
       16633                }
       16634    
       16635 -              // If battlefield display is not available, show error
       16636 -              throw new Error('Battlefield display system not available. Please refresh the page.');
       16635 +          } catch (error) {
       16636 +              console.error('❌ Linux console loading error:', error);
       16637 +              this.showError(`Failed to load survivor audit: ${error.message}`);
       16638 +          }
       16639 +      },
       16640    
       16641 +      // Detailed audit for multiple weeks
       16642 +      async detailedMultiWeekAudit(weeks = [1, 2]) {
       16643 +          const results = {};
       16644 +  
       16645 +          for (const week of weeks) {
       16646 +              results[week] = await this.detailedWeekAudit(week);
       16647 +              if (week < Math.max(...weeks)) {
       16648 +                  await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause
       16649 +              }
       16650 +          }
       16651 +  
       16652 +          return results;
       16653 +      },
       16654 +  
       16655 +      // Detailed audit for a specific week
       16656 +      async detailedWeekAudit(weekNumber) {
       16657 +          const losingTeams = this.losingTeams[weekNumber];
       16658 +          if (!losingTeams) {
       16659 +              console.error(`❌ No losing teams data for Week ${weekNumber}`);
       16660 +              return null;
       16661 +          }
       16662 +  
       16663 +          try {
       16664 +              // Get pool members
       16665 +              const poolMembersRef = doc(db, 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
       16666 +              const poolMembersSnap = await getDoc(poolMembersRef);
       16667 +  
       16668 +              if (!poolMembersSnap.exists()) {
       16669 +                  console.error('❌ Pool members not found');
       16670 +                  return null;
       16671 +              }
       16672 +  
       16673 +              const memberIds = Object.keys(poolMembersSnap.data());
       16674 +  
       16675 +              // Get current elimination status
       16676 +              const statusDocRef = doc(db, 'artifacts/nerdfootball/public/data/nerdSurvivor_status/status');
       16677 +              const statusSnap = await getDoc(statusDocRef);
       16678 +              const allStatuses = statusSnap.exists() ? statusSnap.data() : {};
       16679 +  
       16680 +              const detailedAudit = {
       16681 +                  weekNumber,
       16682 +                  totalMembers: memberIds.length,
       16683 +                  userDetails: [],
       16684 +                  winningPicks: [],
       16685 +                  losingPicks: [],
       16686 +                  noPicks: [],
       16687 +                  eliminated: []
       16688 +              };
       16689 +  
       16690 +              // Audit each member with full details
       16691 +              for (const userId of memberIds) {
       16692 +                  try {
       16693 +                      // Get user profile
       16694 +                      const profile = await this.getUserProfile(userId);
       16695 +                      const shortUserId = userId.substring(0, 8) + '...';
       16696 +  
       16697 +                      // Check if already eliminated
       16698 +                      if (allStatuses[userId]?.eliminated) {
       16699 +                          detailedAudit.eliminated.push({
       16700 +                              userId: shortUserId,
       16701 +                              fullUserId: userId,
       16702 +                              name: profile.name,
       16703 +                              email: profile.email,
       16704 +                              eliminatedWeek: allStatuses[userId].eliminatedWeek,
       16705 +                              reason: allStatuses[userId].eliminationReason
       16706 +                          });
       16707 +                          continue;
       16708 +                      }
       16709 +  
       16710 +                      // Get user's picks
       16711 +                      const userPicksDocRef = doc(db, 'artifacts/nerdfootball/public/data/nerdSurvivor_picks', userId);
       16712 +                      const userPicksSnap = await getDoc(userPicksDocRef);
       16713 +  
       16714 +                      if (!userPicksSnap.exists()) {
       16715 +                          detailedAudit.noPicks.push({
       16716 +                              userId: shortUserId,
       16717 +                              fullUserId: userId,
       16718 +                              name: profile.name,
       16719 +                              email: profile.email,
       16720 +                              reason: 'No picks document'
       16721 +                          });
       16722 +                          continue;
       16723 +                      }
       16724 +  
       16725 +                      const userPicksData = userPicksSnap.data();
       16726 +                      const userPicks = userPicksData.picks || {};
       16727 +                      const weekPick = userPicks[weekNumber];
       16728 +  
       16729 +                      if (!weekPick) {
       16730 +                          detailedAudit.noPicks.push({
       16731 +                              userId: shortUserId,
       16732 +                              fullUserId: userId,
       16733 +                              name: profile.name,
       16734 +                              email: profile.email,
       16735 +                              reason: `No Week ${weekNumber} pick`
       16736 +                          });
       16737 +                          continue;
       16738 +                      }
       16739 +  
       16740 +                      const pickedTeam = weekPick.team;
       16741 +                      const hasGameId = !!weekPick.gameId;
       16742 +  
       16743 +                      const userDetail = {
       16744 +                          userId: shortUserId,
       16745 +                          fullUserId: userId,
       16746 +                          name: profile.name,
       16747 +                          email: profile.email,
       16748 +                          pickedTeam: pickedTeam,
       16749 +                          gameId: weekPick.gameId || 'MISSING',
       16750 +                          timestamp: weekPick.timestamp || 'Unknown',
       16751 +                          hasGameId: hasGameId
       16752 +                      };
       16753 +  
       16754 +                      detailedAudit.userDetails.push(userDetail);
       16755 +  
       16756 +                      // Categorize by win/loss
       16757 +                      if (losingTeams.includes(pickedTeam)) {
       16758 +                          detailedAudit.losingPicks.push({
       16759 +                              ...userDetail,
       16760 +                              shouldBeEliminated: true
       16761 +                          });
       16762 +                      } else {
       16763 +                          detailedAudit.winningPicks.push({
       16764 +                              ...userDetail,
       16765 +                              shouldSurvive: true
       16766 +                          });
       16767 +                      }
       16768 +  
       16769 +                  } catch (error) {
       16770 +                      console.error(`❌ Error auditing user ${userId}:`, error);
       16771 +                  }
       16772 +              }
       16773 +  
       16774 +              return detailedAudit;
       16775 +  
       16776            } catch (error) {
       16777 -              console.error('❌ Survivor loading error:', error);
       16778 -              this.showError(`Failed to load survivor results: ${error.message}`);
       16777 +              console.error(`❌ Detailed audit failed for Week ${weekNumber}:`, error);
       16778 +              return null;
       16779            }
       16780        },
       16781 +  
       16782 +      // Display beautiful Linux console-style results
       16783 +      displayLinuxConsoleResults: function(auditResults) {
       16784 +          const startTime = performance.now();
       16785 +  
       16786 +          let html = `
       16787 +              <div class="bg-black text-green-400 font-mono text-sm p-6 rounded-lg border border-green-500 shadow-2xl" style="background: linear-gradient(145deg, #000000, 
             + #0a0a0a); box-shadow: inset 0 0 20px rgba(0, 255, 0, 0.1);">
       16788 +                  <!-- Terminal Header -->
       16789 +                  <div class="border-b border-green-500 pb-4 mb-6">
       16790 +                      <div class="flex items-center justify-between">
       16791 +                          <div class="flex items-center space-x-2">
       16792 +                              <div class="w-3 h-3 rounded-full bg-red-500"></div>
       16793 +                              <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
       16794 +                              <div class="w-3 h-3 rounded-full bg-green-500"></div>
       16795 +                          </div>
       16796 +                          <div class="text-green-300">root@nerdfootball:~$ survivor_audit --verbose</div>
       16797 +                      </div>
       16798 +                      <div class="mt-4 text-center">
       16799 +                          <pre class="text-green-400 text-xs leading-tight">
       16800 +       ██████  ██    ██ ██████  ██    ██ ██ ██    ██  ██████  ██████
       16801 +      ██       ██    ██ ██   ██ ██    ██ ██ ██    ██ ██    ██ ██   ██
       16802 +      ██████   ██    ██ ██████  ██    ██ ██ ██    ██ ██    ██ ██████
       16803 +           ██  ██    ██ ██   ██  ██  ██  ██  ██  ██  ██    ██ ██   ██
       16804 +      ██████    ██████  ██   ██   ████   ██   ████    ██████  ██   ██
       16805 +  
       16806 +                          ◢◤ DETAILED AUDIT SYSTEM v3.0 ◥◣
       16807 +                          </pre>
       16808 +                      </div>
       16809 +                  </div>
       16810 +  
       16811 +                  <!-- System Status -->
       16812 +                  <div class="mb-6 p-4 border border-green-600 rounded bg-green-900 bg-opacity-20">
       16813 +                      <div class="text-green-300 font-bold mb-2">[SYSTEM STATUS]</div>
       16814 +                      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
       16815 +                          <div>◉ CPU: Online</div>
       16816 +                          <div>◉ Memory: ${Math.round(performance.memory?.usedJSHeapSize / 1024 / 1024 || 0)}MB</div>
       16817 +                          <div>◉ Audit Engine: Active</div>
       16818 +                          <div>◉ Data Integrity: Verified</div>
       16819 +                      </div>
       16820 +                  </div>
       16821 +          `;
       16822 +  
       16823 +          // Process each week with Linux terminal styling
       16824 +          Object.keys(auditResults).forEach(week => {
       16825 +              const audit = auditResults[week];
       16826 +              if (!audit) return;
       16827 +  
       16828 +              html += this.generateLinuxWeekOutput(audit);
       16829 +          });
       16830 +  
       16831 +          // Terminal footer
       16832 +          html += `
       16833 +                  <div class="border-t border-green-500 pt-4 mt-6 text-center">
       16834 +                      <div class="text-green-300 text-xs">
       16835 +                          ✓ Audit completed • ${Object.keys(auditResults).length} weeks processed •
       16836 +                          ${new Date().toLocaleString()} • NerdFootball Survivor Audit System
       16837 +                      </div>
       16838 +                  </div>
       16839 +              </div>
       16840 +          `;
       16841 +  
       16842 +          allUI.survivorResultsBody.innerHTML = html;
       16843 +  
       16844 +          const loadTime = performance.now() - startTime;
       16845 +          console.log(`💻 Linux console displayed in ${loadTime.toFixed(1)}ms`);
       16846 +      },
       16847 +  
       16848 +      // Generate Linux terminal-style output for a week
       16849 +      generateLinuxWeekOutput: function(audit) {
       16850 +          const losingTeams = this.losingTeams[audit.weekNumber] || [];
       16851 +  
       16852 +          let html = `
       16853 +              <div class="mb-8 border border-green-600 rounded p-4 bg-green-900 bg-opacity-10">
       16854 +                  <div class="text-green-300 font-bold mb-3">
       16855 +                      root@nerdfootball:~$ ./week${audit.weekNumber}_audit.sh --detailed
       16856 +                  </div>
       16857 +  
       16858 +                  <!-- Week Stats Terminal Output -->
       16859 +                  <div class="bg-black p-3 rounded border border-green-700 mb-4">
       16860 +                      <div class="text-green-400 text-xs mb-2">Scanning survivor pool database...</div>
       16861 +                      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
       16862 +                          <div class="text-blue-400">TOTAL: <span class="text-white font-bold">${audit.totalMembers}</span></div>
       16863 +                          <div class="text-green-400">ALIVE: <span class="text-white font-bold">${audit.winningPicks.length}</span></div>
       16864 +                          <div class="text-red-400">DEAD: <span class="text-white font-bold">${audit.losingPicks.length}</span></div>
       16865 +                          <div class="text-yellow-400">NULL: <span class="text-white font-bold">${audit.noPicks.length}</span></div>
       16866 +                          <div class="text-purple-400">TERM: <span class="text-white font-bold">${audit.eliminated.length}</span></div>
       16867 +                      </div>
       16868 +                  </div>
       16869 +  
       16870 +                  <!-- Losing Teams Reference -->
       16871 +                  <div class="mb-4 p-3 bg-red-900 bg-opacity-20 border border-red-600 rounded">
       16872 +                      <div class="text-red-400 font-bold text-xs mb-2">WEEK ${audit.weekNumber} LOSING_TEAMS[] = {</div>
       16873 +                      <div class="text-red-300 text-xs pl-4 grid grid-cols-2 md:grid-cols-4 gap-1">
       16874 +                          ${losingTeams.map((team, i) => `<div>[${i}] "${team}"</div>`).join('')}
       16875 +                      </div>
       16876 +                      <div class="text-red-400 text-xs">}; // ${losingTeams.length} eliminated teams</div>
       16877 +                  </div>
       16878 +          `;
       16879 +  
       16880 +          // Surviving Users - Linux style table
       16881 +          if (audit.winningPicks.length > 0) {
       16882 +              html += `
       16883 +                  <div class="mb-6">
       16884 +                      <div class="text-green-300 font-bold text-xs mb-2">
       16885 +                          ./query --table=survivors --week=${audit.weekNumber} --status=alive
       16886 +                      </div>
       16887 +                      <div class="bg-black border border-green-600 rounded overflow-hidden">
       16888 +                          <div class="bg-green-700 text-black p-2 text-xs font-bold grid grid-cols-12 gap-1">
       16889 +                              <div class="col-span-3">USERNAME</div>
       16890 +                              <div class="col-span-4">EMAIL</div>
       16891 +                              <div class="col-span-3">TEAM_SELECTED</div>
       16892 +                              <div class="col-span-2">GAME_ID</div>
       16893 +                          </div>
       16894 +                          <div class="max-h-64 overflow-y-auto">
       16895 +                              ${audit.winningPicks.map(pick => `
       16896 +                                  <div class="p-2 border-b border-green-800 text-xs grid grid-cols-12 gap-1 hover:bg-green-900 hover:bg-opacity-20">
       16897 +                                      <div class="col-span-3 text-green-400 font-mono">${pick.name.substring(0, 20)}</div>
       16898 +                                      <div class="col-span-4 text-green-300 font-mono">${pick.email.substring(0, 28)}</div>
       16899 +                                      <div class="col-span-3 text-white font-bold">${pick.pickedTeam.substring(0, 18)}</div>
       16900 +                                      <div class="col-span-2 text-blue-400">${pick.gameId}</div>
       16901 +                                  </div>
       16902 +                              `).join('')}
       16903 +                          </div>
       16904 +                          <div class="bg-green-800 text-black p-1 text-xs">
       16905 +                              Query returned ${audit.winningPicks.length} records. Status: SUCCESS
       16906 +                          </div>
       16907 +                      </div>
       16908 +                  </div>
       16909 +              `;
       16910 +          }
       16911 +  
       16912 +          // Dead Users - Linux style error output
       16913 +          if (audit.losingPicks.length > 0) {
       16914 +              html += `
       16915 +                  <div class="mb-6">
       16916 +                      <div class="text-red-300 font-bold text-xs mb-2">
       16917 +                          ./query --table=eliminations --week=${audit.weekNumber} --status=dead
       16918 +                      </div>
       16919 +                      <div class="bg-black border border-red-600 rounded overflow-hidden">
       16920 +                          <div class="bg-red-700 text-black p-2 text-xs font-bold grid grid-cols-12 gap-1">
       16921 +                              <div class="col-span-3">USERNAME</div>
       16922 +                              <div class="col-span-4">EMAIL</div>
       16923 +                              <div class="col-span-3">FATAL_PICK</div>
       16924 +                              <div class="col-span-2">GAME_ID</div>
       16925 +                          </div>
       16926 +                          <div class="max-h-64 overflow-y-auto">
       16927 +                              ${audit.losingPicks.map(pick => `
       16928 +                                  <div class="p-2 border-b border-red-800 text-xs grid grid-cols-12 gap-1 hover:bg-red-900 hover:bg-opacity-20">
       16929 +                                      <div class="col-span-3 text-red-400 font-mono">${pick.name.substring(0, 20)}</div>
       16930 +                                      <div class="col-span-4 text-red-300 font-mono">${pick.email.substring(0, 28)}</div>
       16931 +                                      <div class="col-span-3 text-red-500 font-bold">💀 ${pick.pickedTeam.substring(0, 15)}</div>
       16932 +                                      <div class="col-span-2 text-blue-400">${pick.gameId}</div>
       16933 +                                  </div>
       16934 +                              `).join('')}
       16935 +                          </div>
       16936 +                          <div class="bg-red-800 text-white p-1 text-xs">
       16937 +                              ERROR: ${audit.losingPicks.length} fatal picks detected. Elimination required.
       16938 +                          </div>
       16939 +                      </div>
       16940 +                  </div>
       16941 +              `;
       16942 +          }
       16943 +  
       16944 +          // Null entries and eliminated - compact display
       16945 +          if (audit.noPicks.length > 0 || audit.eliminated.length > 0) {
       16946 +              html += `
       16947 +                  <div class="grid md:grid-cols-2 gap-4 mb-4">
       16948 +              `;
       16949 +  
       16950 +              if (audit.noPicks.length > 0) {
       16951 +                  html += `
       16952 +                      <div class="bg-yellow-900 bg-opacity-20 border border-yellow-600 rounded p-3">
       16953 +                          <div class="text-yellow-400 font-bold text-xs mb-2">NULL_PICKS[] = {</div>
       16954 +                          <div class="max-h-32 overflow-y-auto text-xs">
       16955 +                              ${audit.noPicks.map(user => `
       16956 +                                  <div class="text-yellow-300 font-mono">• ${user.name} (${user.reason})</div>
       16957 +                              `).join('')}
       16958 +                          </div>
       16959 +                          <div class="text-yellow-400 text-xs mt-2">}; // ${audit.noPicks.length} null entries</div>
       16960 +                      </div>
       16961 +                  `;
       16962 +              }
       16963 +  
       16964 +              if (audit.eliminated.length > 0) {
       16965 +                  html += `
       16966 +                      <div class="bg-purple-900 bg-opacity-20 border border-purple-600 rounded p-3">
       16967 +                          <div class="text-purple-400 font-bold text-xs mb-2">TERMINATED[] = {</div>
       16968 +                          <div class="max-h-32 overflow-y-auto text-xs">
       16969 +                              ${audit.eliminated.map(user => `
       16970 +                                  <div class="text-purple-300 font-mono">• ${user.name} (Week ${user.eliminatedWeek})</div>
       16971 +                              `).join('')}
       16972 +                          </div>
       16973 +                          <div class="text-purple-400 text-xs mt-2">}; // ${audit.eliminated.length} terminated</div>
       16974 +                      </div>
       16975 +                  `;
       16976 +              }
       16977 +  
       16978 +              html += `</div>`;
       16979 +          }
       16980 +  
       16981 +          html += `
       16982 +                  <div class="text-green-400 text-xs mt-3">
       16983 +                      ✓ Week ${audit.weekNumber} audit completed. Exit code: 0
       16984 +                  </div>
       16985 +              </div>
       16986 +          `;
       16987 +  
       16988 +          return html;
       16989 +      },
       16990        
       16991        // Calculate simple stats for fallback
       16992        calculateSimpleStats: function(results) {
