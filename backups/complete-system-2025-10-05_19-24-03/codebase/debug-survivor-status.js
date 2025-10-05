// Debug script to investigate survivor status data structure
console.log("🔍 SURVIVOR STATUS DEBUG SCRIPT");

// Add this code to browser console or inject into index.html temporarily
async function debugSurvivorStatus() {
    try {
        // Get the status path
        const statusPath = survivorStatusPath();
        console.log("📂 Status path:", statusPath);
        
        // Get the status document
        const statusDocRef = doc(db, statusPath);
        const statusSnap = await getDoc(statusDocRef);
        
        console.log("📄 Status document exists:", statusSnap.exists());
        
        if (statusSnap.exists()) {
            const allStatuses = statusSnap.data();
            console.log("📊 Raw status data:", allStatuses);
            
            // Check each user's status
            Object.keys(allStatuses).forEach(userId => {
                const userStatus = allStatuses[userId];
                console.log(`👤 User ${userId}:`, {
                    eliminated: userStatus.eliminated,
                    eliminatedWeek: userStatus.eliminatedWeek,
                    currentWeekPick: userStatus.currentWeekPick,
                    lastUpdated: userStatus.lastUpdated
                });
            });
            
            // Count eliminated users
            const eliminatedUsers = Object.keys(allStatuses).filter(userId => 
                allStatuses[userId].eliminated === true
            );
            console.log("❌ Eliminated users count:", eliminatedUsers.length);
            console.log("❌ Eliminated user IDs:", eliminatedUsers);
            
        } else {
            console.log("⚠️ Status document does not exist!");
        }
        
    } catch (error) {
        console.error("🚨 Error debugging survivor status:", error);
    }
}

// Also debug the pool members and allUsers
async function debugPoolMembers() {
    try {
        console.log("👥 All users from allUsers:", allUsers.map(u => ({
            id: u.id,
            displayName: u.displayName,
            email: u.email
        })));
        
        // Check if ghost users are present
        const ghostUserId = 'okl4sw2aDhW3yKpOfOwe5lH7OQj1';
        const hasGhost = allUsers.some(u => u.id === ghostUserId);
        console.log("👻 Ghost user present:", hasGhost);
        
    } catch (error) {
        console.error("🚨 Error debugging pool members:", error);
    }
}

// Run both debug functions
console.log("🚀 Starting survivor status debug...");
debugSurvivorStatus();
debugPoolMembers();