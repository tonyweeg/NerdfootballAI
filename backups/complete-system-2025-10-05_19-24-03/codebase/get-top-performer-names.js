// Get display names for top performers
// Initialize Firebase (matching the project config)
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDAF1MbAhL2uPIVUGMDlXvCqtknUUCX5Gw",
    authDomain: "nerdfootball.firebaseapp.com",
    databaseURL: "https://nerdfootball-default-rtdb.firebaseio.com",
    projectId: "nerdfootball",
    storageBucket: "nerdfootball.appspot.com",
    messagingSenderId: "969304790725",
    appId: "1:969304790725:web:892df38db0b0e62bde02ac"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function getTopPerformerNames() {
    try {
        const topUIDs = [
            'CX0etIyJbGg33nmHCo4eezPWrsr2',  // Season leader: 232 pts
            'sm17z8ovI8NAGmyQvogD86lIurr1',  // Season 2nd: 231 pts
            'dN91P1yGG4YBttxeGWmpAM2xhl22', // Season 3rd: 224 pts
            'S4Hwrm449UfrNf77QgHxtQEtEY13',  // Week 1 leader: 123 pts
            'w9a0168NrKRH3sgB4BoFYCt7miV2',  // Week 1 tied: 123 pts
            '30bXFADO8jaFIQTHxSj7Qi2YSRi2'   // Week 2 leader: 115 pts
        ];

        // Get pool members
        const poolMembersPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members';
        const membersRef = doc(db, poolMembersPath);
        const membersSnap = await getDoc(membersRef);

        if (!membersSnap.exists()) {
            console.log('❌ Pool members not found');
            return;
        }

        const allMembers = Object.values(membersSnap.data());
        console.log('🏆 TOP PERFORMERS WITH NAMES:\n');

        // Week 1 + 2 Combined (Season Leaders):
        console.log('🥇 SEASON LEADERS (Weeks 1+2):');
        console.log('1. CX0etIyJbGg33nmHCo4eezPWrsr2 (232 pts): ', getMemberName(allMembers, 'CX0etIyJbGg33nmHCo4eezPWrsr2'));
        console.log('2. sm17z8ovI8NAGmyQvogD86lIurr1 (231 pts): ', getMemberName(allMembers, 'sm17z8ovI8NAGmyQvogD86lIurr1'));
        console.log('3. dN91P1yGG4YBttxeGWmpAM2xhl22 (224 pts): ', getMemberName(allMembers, 'dN91P1yGG4YBttxeGWmpAM2xhl22'));

        console.log('\n📊 WEEK 1 LEADERS:');
        console.log('1. S4Hwrm449UfrNf77QgHxtQEtEY13 (123 pts): ', getMemberName(allMembers, 'S4Hwrm449UfrNf77QgHxtQEtEY13'));
        console.log('2. w9a0168NrKRH3sgB4BoFYCt7miV2 (123 pts): ', getMemberName(allMembers, 'w9a0168NrKRH3sgB4BoFYCt7miV2'));
        console.log('3. dN91P1yGG4YBttxeGWmpAM2xhl22 (122 pts): ', getMemberName(allMembers, 'dN91P1yGG4YBttxeGWmpAM2xhl22'));

        console.log('\n📊 WEEK 2 LEADERS:');
        console.log('1. 30bXFADO8jaFIQTHxSj7Qi2YSRi2 (115 pts): ', getMemberName(allMembers, '30bXFADO8jaFIQTHxSj7Qi2YSRi2'));
        console.log('2. CX0etIyJbGg33nmHCo4eezPWrsr2 (112 pts): ', getMemberName(allMembers, 'CX0etIyJbGg33nmHCo4eezPWrsr2'));
        console.log('3. sm17z8ovI8NAGmyQvogD86lIurr1 (111 pts): ', getMemberName(allMembers, 'sm17z8ovI8NAGmyQvogD86lIurr1'));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

function getMemberName(allMembers, uid) {
    const member = allMembers.find(m => m.uid === uid);
    return member ? (member.displayName || member.email || `User ${uid.slice(-6)}`) : 'Unknown';
}

getTopPerformerNames();