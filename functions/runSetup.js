const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'nerdfootball'
});

const { setupTournament } = require('./setupNerdMadnessBracket');

async function run() {
    console.log('🏀 Starting bracket setup...');
    try {
        await setupTournament();
        console.log('✅ Setup complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

run();
