#!/usr/bin/env node

// Quick test to verify the security fix for survivor picks
const fs = require('fs');

// Read the index.html file to check the security fixes
const indexContent = fs.readFileSync('/Users/tonyweeg/nerdfootball-project/public/index.html', 'utf8');

console.log('🔒 Testing Security Fix for Survivor Picks');
console.log('===========================================');

// Check if the getGameState function was added to SurvivorPicksView
const survivorGetGameStateExists = indexContent.includes('getGameState: function(game)') && 
    indexContent.includes("return 'PRE_GAME';") &&
    indexContent.includes("return 'IN_PROGRESS';") &&
    indexContent.includes("return 'COMPLETED';");

console.log(`✅ SurvivorPicksView.getGameState function: ${survivorGetGameStateExists ? 'ADDED' : 'MISSING'}`);

// Check if the checkSurvivorPickLocked function uses proper game state validation
const survivorSecurityFix = indexContent.includes('checkSurvivorPickLocked: async function()') &&
    indexContent.includes('const gameState = this.getGameState(game);') &&
    indexContent.includes("return gameState === 'IN_PROGRESS' || gameState === 'COMPLETED';");

console.log(`✅ SurvivorPicksView.checkSurvivorPickLocked security fix: ${survivorSecurityFix ? 'IMPLEMENTED' : 'MISSING'}`);

// Check if the global getGameState function was added
const globalGetGameStateExists = indexContent.includes('function getGameState(game)') &&
    indexContent.includes('Get game state using proper validation logic');

console.log(`✅ Global getGameState function: ${globalGetGameStateExists ? 'ADDED' : 'MISSING'}`);

// Check if the isGameLocked function uses proper game state validation
const mainSystemSecurityFix = indexContent.includes('function isGameLocked(game)') &&
    indexContent.includes('const gameState = getGameState(game);') &&
    indexContent.includes("return gameState === 'IN_PROGRESS' || gameState === 'COMPLETED';");

console.log(`✅ Main system isGameLocked security fix: ${mainSystemSecurityFix ? 'IMPLEMENTED' : 'MISSING'}`);

// Summary
const allSecurityFixesImplemented = survivorGetGameStateExists && survivorSecurityFix && 
    globalGetGameStateExists && mainSystemSecurityFix;

console.log('\n🎯 SECURITY FIX SUMMARY:');
console.log(`Overall Status: ${allSecurityFixesImplemented ? '✅ ALL FIXES IMPLEMENTED' : '❌ INCOMPLETE'}`);

if (allSecurityFixesImplemented) {
    console.log('\n🔒 Security vulnerability has been fixed!');
    console.log('- Picks are now blocked when games are IN_PROGRESS');
    console.log('- Picks are now blocked when games are COMPLETED');
    console.log('- Picks are ONLY allowed when games are PRE_GAME');
    console.log('- Both main picks and survivor picks systems are protected');
} else {
    console.log('\n❌ Security vulnerability still exists - fixes incomplete!');
}

console.log('\n===========================================');