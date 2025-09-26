const { execSync } = require('child_process');

function runFirestoreQuery(path) {
    try {
        const command = `firebase firestore:get "${path}" --project nerdfootball`;
        console.log(`🔍 Running: ${command}`);
        const result = execSync(command, { encoding: 'utf8' });
        return result;
    } catch (error) {
        console.log(`❌ Error querying ${path}:`, error.message);
        return null;
    }
}

function runFirestoreList(path) {
    try {
        const command = `firebase firestore:delete "${path}" --project nerdfootball --shallow --dry-run`;
        console.log(`🔍 Listing collections under: ${path}`);
        const result = execSync(command, { encoding: 'utf8' });
        return result;
    } catch (error) {
        console.log(`❌ Error listing ${path}:`, error.message);
        return null;
    }
}

async function debugChuckUpshurData() {
    console.log('🔍 Investigating Chuck Upshur\'s survivor data via Firebase CLI...');

    // First, get pool members
    const poolId = 'nerduniverse-2025';
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;

    console.log('\n1️⃣ Getting pool members...');
    const membersResult = runFirestoreQuery(poolMembersPath);

    if (!membersResult) {
        console.log('❌ Could not retrieve pool members');
        return;
    }

    console.log('📄 Pool members raw data:');
    console.log(membersResult);

    // Let's try to find Chuck by listing all survivor user documents
    console.log('\n2️⃣ Checking survivor users structure...');
    const survivorUsersPath = `artifacts/nerdfootball/pools/${poolId}/games/survivor/users`;

    try {
        const listCommand = `firebase firestore:delete "${survivorUsersPath}" --project nerdfootball --shallow --recursive --dry-run`;
        console.log(`🔍 Running: ${listCommand}`);
        const listResult = execSync(listCommand, { encoding: 'utf8' });
        console.log('📁 Survivor users structure:');
        console.log(listResult);
    } catch (error) {
        console.log('❌ Could not list survivor users:', error.message);
    }

    // Check compiled survivor data
    console.log('\n3️⃣ Checking compiled survivor data...');
    const compiledSurvivorPath = `artifacts/nerdfootball/pools/${poolId}/games/survivor/compiledSurvivor`;
    const compiledResult = runFirestoreQuery(compiledSurvivorPath);

    if (compiledResult) {
        console.log('📊 Compiled survivor data:');
        console.log(compiledResult);
    }

    // Let's also check if there are any collections under survivor
    console.log('\n4️⃣ Exploring survivor game structure...');
    const survivorPath = `artifacts/nerdfootball/pools/${poolId}/games/survivor`;

    try {
        const survivorCommand = `firebase firestore:delete "${survivorPath}" --project nerdfootball --shallow --recursive --dry-run`;
        console.log(`🔍 Running: ${survivorCommand}`);
        const survivorResult = execSync(survivorCommand, { encoding: 'utf8' });
        console.log('🏈 Survivor structure:');
        console.log(survivorResult);
    } catch (error) {
        console.log('❌ Could not explore survivor structure:', error.message);
    }
}

debugChuckUpshurData();