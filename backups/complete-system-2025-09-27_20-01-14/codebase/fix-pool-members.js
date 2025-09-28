// Fix Pool Members - Add Missing UIDs and Remove James Stewart
// Run this script to fix all pool member UID issues

const MEMBER_FIXES = [
    { email: 'dstubbs7@gmail.com', uid: 'w9a0168NrKRH3sgB4BoFYCt7miV2', name: 'Daniel Stubblebine' },
    { email: 'juliorico75@gmail.com', uid: 'Ym8yukuU84ddcP6q5WRVMfdaKME3', name: 'Wholeeoh' },
    { email: 'frankhanna00@gmail.com', uid: 'VgSENtkpw0aXjKBB4wBuPdnJyag2', name: 'Frank Hanna' },
    { email: 'gone2tan@yahoo.com', uid: 'THoYhTIT46RdGeNuL9CyfPCJtZ73', name: 'Teena Quintavalle' },
    { email: 'j73176@gmail.com', uid: 'wUI08jbCuOb8GVivLdt1H0vC8Fy2', name: 'Jerry Beauchamp' },
    { email: 'zander.guerr@yahoo.com', uid: 'xtL4exuqOCW28NwnYoSwsBWas7j2', name: 'Zander Guerrieri' },
    { email: 'leroylutz@hotmail.com', uid: 'vIuhLHwJ7thZae2mWBSjS5Orr6k2', name: 'jim lutz' }
];

const REMOVE_USER = 'james.stewart@example.com'; // Remove completely

async function fixPoolMembers() {
    try {
        console.log('🔧 Starting pool member fixes...');

        // Get current pool members
        const membersRef = window.doc(window.db, 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
        const membersSnap = await window.getDoc(membersRef);

        if (!membersSnap.exists()) {
            console.error('❌ Pool members document not found');
            return;
        }

        const membersData = membersSnap.data();
        let fixedCount = 0;
        let removedCount = 0;

        // Fix missing UIDs
        for (const [key, member] of Object.entries(membersData)) {
            if (!member || !member.email) continue;

            // Remove James Stewart completely
            if (member.email === REMOVE_USER) {
                console.log(`🗑️ Removing James Stewart (${REMOVE_USER})`);
                delete membersData[key];
                removedCount++;
                continue;
            }

            // Add missing UIDs
            const fix = MEMBER_FIXES.find(f => f.email === member.email);
            if (fix && (!member.uid || member.uid === 'undefined')) {
                console.log(`✅ Adding UID for ${fix.name} (${fix.email}): ${fix.uid}`);
                member.uid = fix.uid;
                fixedCount++;
            }
        }

        // Save updated data
        await window.setDoc(membersRef, membersData);

        console.log(`🎉 Pool member fixes complete!`);
        console.log(`   ✅ Fixed UIDs: ${fixedCount}`);
        console.log(`   🗑️ Removed users: ${removedCount}`);
        console.log(`   📊 Total pool members: ${Object.keys(membersData).length}`);

        return { fixedCount, removedCount, totalMembers: Object.keys(membersData).length };

    } catch (error) {
        console.error('❌ Error fixing pool members:', error);
        throw error;
    }
}

// Make function available globally
window.fixPoolMembers = fixPoolMembers;

console.log('🔧 Pool member fix script loaded. Run: window.fixPoolMembers()');