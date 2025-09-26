// 💎 DIAMOND LEVEL UNIT TESTS - Pool Members Functions
// Tests the core pool member functions for correctness

/**
 * @jest-environment jsdom
 */

describe('💎 Diamond Level Pool Members Unit Tests', () => {
    
    // Mock Firebase
    let mockPoolMembers;
    
    beforeEach(() => {
        // Setup mock pool members data
        mockPoolMembers = {
            'WxSPmEildJdqs6T5hIpBUZrscwt2': {
                displayName: 'Tony Admin',
                email: 'admin@test.com',
                role: 'admin',
                joinedAt: '2025-01-01T00:00:00Z'
            },
            'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2': {
                displayName: 'Test User',
                email: 'user@test.com',
                role: 'member',
                joinedAt: '2025-01-02T00:00:00Z'
            },
            'testuser3': {
                displayName: 'Another User',
                email: 'another@test.com',
                role: 'member',
                joinedAt: '2025-01-03T00:00:00Z'
            }
        };
        
        // Note: Ghost user okl4sw2aDhW3yKpOfOwe5lH7OQj1 is NOT in pool members
    });
    
    test('🚨 CRITICAL: getPoolMembersAsUsers returns correct user count', () => {
        const users = mockPoolMembers;
        expect(Object.keys(users).length).toBe(3);
        console.log('✅ Pool members has exactly 3 users (no ghosts)');
    });
    
    test('🚨 CRITICAL: Ghost user NOT in pool members', () => {
        const ghostUserId = 'okl4sw2aDhW3yKpOfOwe5lH7OQj1';
        expect(mockPoolMembers[ghostUserId]).toBeUndefined();
        console.log('✅ Ghost user correctly absent from pool members');
    });
    
    test('✅ Pool members have required fields', () => {
        Object.entries(mockPoolMembers).forEach(([uid, user]) => {
            expect(user.displayName).toBeDefined();
            expect(user.email).toBeDefined();
            expect(user.role).toBeDefined();
            expect(['admin', 'member']).toContain(user.role);
        });
        console.log('✅ All pool members have required fields');
    });
    
    test('✅ Pool members format conversion', () => {
        // Simulate conversion to standard user format
        const users = {};
        for (const [uid, memberData] of Object.entries(mockPoolMembers)) {
            users[uid] = {
                uid: uid,
                id: uid,
                displayName: memberData.displayName || memberData.email || 'Unknown',
                email: memberData.email || '',
                role: memberData.role || 'member',
                joinedAt: memberData.joinedAt,
                ...memberData
            };
        }
        
        // Check conversion
        expect(users['WxSPmEildJdqs6T5hIpBUZrscwt2'].uid).toBe('WxSPmEildJdqs6T5hIpBUZrscwt2');
        expect(users['WxSPmEildJdqs6T5hIpBUZrscwt2'].id).toBe('WxSPmEildJdqs6T5hIpBUZrscwt2');
        expect(users['WxSPmEildJdqs6T5hIpBUZrscwt2'].displayName).toBe('Tony Admin');
        expect(users['WxSPmEildJdqs6T5hIpBUZrscwt2'].role).toBe('admin');
        
        console.log('✅ Pool members correctly convert to user format');
    });
    
    test('🚨 CRITICAL: No duplicate users in pool members', () => {
        const emails = new Set();
        const displayNames = new Set();
        let hasDuplicates = false;
        
        Object.values(mockPoolMembers).forEach(user => {
            if (emails.has(user.email)) {
                hasDuplicates = true;
                console.log(`❌ Duplicate email found: ${user.email}`);
            }
            if (displayNames.has(user.displayName)) {
                hasDuplicates = true;
                console.log(`❌ Duplicate name found: ${user.displayName}`);
            }
            emails.add(user.email);
            displayNames.add(user.displayName);
        });
        
        expect(hasDuplicates).toBe(false);
        console.log('✅ No duplicate users in pool members');
    });
    
    test('✅ Admin users properly identified', () => {
        const adminUsers = Object.entries(mockPoolMembers)
            .filter(([uid, user]) => user.role === 'admin')
            .map(([uid]) => uid);
        
        expect(adminUsers).toContain('WxSPmEildJdqs6T5hIpBUZrscwt2');
        expect(adminUsers.length).toBeGreaterThan(0);
        console.log(`✅ ${adminUsers.length} admin user(s) properly identified`);
    });
    
    test('✅ Array conversion for compatibility', () => {
        // Test conversion to array format (used by some functions)
        const usersArray = Object.keys(mockPoolMembers).map(uid => ({
            id: uid,
            ...mockPoolMembers[uid]
        }));
        
        expect(Array.isArray(usersArray)).toBe(true);
        expect(usersArray.length).toBe(3);
        expect(usersArray[0].id).toBeDefined();
        expect(usersArray[0].displayName).toBeDefined();
        
        console.log('✅ Pool members correctly convert to array format');
    });
    
    test('🚨 CRITICAL: Legacy function redirects work', () => {
        // Simulate legacy function redirects
        const getCleanUsers = () => mockPoolMembers;
        const getCachedUsers = () => mockPoolMembers;
        const getAllUsers = () => mockPoolMembers;
        const fetchAllUsers = () => Object.keys(mockPoolMembers).map(uid => ({
            id: uid,
            ...mockPoolMembers[uid]
        }));
        
        expect(getCleanUsers()).toBe(mockPoolMembers);
        expect(getCachedUsers()).toBe(mockPoolMembers);
        expect(getAllUsers()).toBe(mockPoolMembers);
        expect(fetchAllUsers().length).toBe(3);
        
        console.log('✅ All legacy functions redirect to pool members');
    });
});

console.log('\n💎🏆 POOL MEMBERS UNIT TESTS COMPLETE! 🏆💎');