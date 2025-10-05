const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function comparePicksStructure() {
    const week = 5;
    const picksBasePath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions`;

    console.log('\n🔍 COMPARING FRANK HANNA VS WORKING USER\n');
    console.log('='.repeat(80));

    // Frank Hanna
    const frankId = 'VgSENtkpw0aXjKBB4wBuPdnJyag2';
    const frankDoc = await db.doc(`${picksBasePath}/${frankId}`).get();
    const frankData = frankDoc.exists ? frankDoc.data() : {};

    console.log('\n❌ FRANK HANNA\'S PICKS DOCUMENT:\n');
    console.log(JSON.stringify(frankData, null, 2));

    // Get a working user (let's use tonyweeg)
    const tonyId = 'WxSPmEildJdqs6T5hIpBUZrscwt2';
    const tonyDoc = await db.doc(`${picksBasePath}/${tonyId}`).get();
    const tonyData = tonyDoc.exists ? tonyDoc.data() : {};

    console.log('\n\n✅ TONY WEEG\'S PICKS DOCUMENT (WORKING EXAMPLE):\n');
    console.log(JSON.stringify(tonyData, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('\n🔍 ANALYSIS:');
    console.log(`Frank's document has ${Object.keys(frankData).length} fields`);
    console.log(`Tony's document has ${Object.keys(tonyData).length} fields`);

    const frankGameKeys = Object.keys(frankData).filter(k => /^\d+$/.test(k));
    const tonyGameKeys = Object.keys(tonyData).filter(k => /^\d+$/.test(k));

    console.log(`\nFrank's GAME picks (501, 502, etc.): ${frankGameKeys.length}`);
    console.log(`Tony's GAME picks (501, 502, etc.): ${tonyGameKeys.length}`);

    if (frankGameKeys.length === 0) {
        console.log('\n❌ PROBLEM: Frank has NO game picks - only metadata fields!');
        console.log('   His document is missing fields like: 501, 502, 503, etc.');
    }

    console.log('\n' + '='.repeat(80));
    process.exit(0);
}

comparePicksStructure();
