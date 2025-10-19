# Firebase Expert Skill

Firebase deployment and infrastructure specialist for NerdFootball production environment.

## Expertise Areas

### 🚀 Firebase Services
- **Hosting**: CDN optimization, caching strategies
- **Functions**: Cloud Functions deployment and optimization
- **Firestore**: Database queries, security rules, indexes
- **Authentication**: Firebase Auth integration and security
- **Realtime Database**: WebSocket connections for live updates

### 🔧 Firebase Configuration Management

**CRITICAL**: Always use centralized configuration files

```javascript
// ES6 Modules (recommended)
import { getFirebaseConfig } from './js/config/firebase-config.js';
const firebaseConfig = getFirebaseConfig();
firebase.initializeApp(firebaseConfig);

// Compat SDK
<script src="./js/config/firebase-config-compat.js"></script>
<script>
  const firebaseConfig = window.getFirebaseConfig();
  firebase.initializeApp(firebaseConfig);
</script>
```

**Centralized Config Files:**
- `/public/js/config/firebase-config.js` (ES6 modules)
- `/public/js/config/firebase-config-compat.js` (compat SDK)

**Standard Configuration (REFERENCE ONLY):**
- Project ID: `nerdfootball`
- Sender ID: `969304790725`
- App ID: `1:969304790725:web:892df38db0b0e62bde02ac`
- Storage: `nerdfootball.appspot.com`

### 📦 Deployment Standards

**Full Deployment:**
```bash
firebase deploy
```

**Hosting Only (frontend changes):**
```bash
firebase deploy --only hosting
```

**Functions Only (backend/cache/API changes):**
```bash
firebase deploy --only functions
```

**Cache System Validation:**
```bash
firebase deploy --only functions && firebase deploy --only hosting
```

### 🔥 Firestore Patterns

**Repository Pattern for Data Access:**
```javascript
class PoolRepository {
    async getMembers(poolId) {
        const membersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
        const snapshot = await getDocs(collection(db, membersPath));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
}
```

**Efficient Query Patterns:**
```javascript
// BAD: Multiple queries
for (const user of users) {
    const picks = await getDoc(doc(db, `picks/${user.id}`));
}

// GOOD: Batch query
const picksSnapshot = await getDocs(collection(db, 'picks'));
const picksMap = new Map(picksSnapshot.docs.map(d => [d.id, d.data()]));
```

**Cache Integration:**
```javascript
const cacheManager = {
    async load(key, db) {
        const cached = localStorage.getItem(key);
        if (cached) {
            const data = JSON.parse(cached);
            if (Date.now() - data.timestamp < data.ttl) {
                return data.value;
            }
        }
        // Fetch from Firestore
        const doc = await getDoc(...);
        this.save(key, db, doc.data());
        return doc.data();
    }
};
```

### 🛡️ Security Rules Best Practices

**Firestore Rules Pattern:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Pool members - read-only for authenticated users
    match /artifacts/nerdfootball/pools/{poolId}/metadata/members/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid in ['admin_uid_1', 'admin_uid_2'];
    }

    // User picks - users can only write their own
    match /picks/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

### ⚡ Firebase Functions Optimization

**Memory/Timeout Configuration:**
```javascript
exports.getweeklyleaderboard = functions
    .runWith({
        memory: '512MB',
        timeoutSeconds: 60
    })
    .https.onRequest(async (req, res) => {
        // Function logic
    });
```

**Cache-First Functions:**
```javascript
const admin = require('firebase-admin');
const db = admin.firestore();

exports.cachedData = functions.https.onRequest(async (req, res) => {
    const cacheRef = db.doc('cache/data');
    const cache = await cacheRef.get();

    if (cache.exists && !isExpired(cache.data())) {
        return res.json(cache.data());
    }

    const freshData = await fetchExpensiveData();
    await cacheRef.set({
        data: freshData,
        timestamp: Date.now()
    });

    res.json(freshData);
});
```

### 📊 Production Monitoring

**Cloud Functions Logs:**
```bash
firebase functions:log --only getweeklyleaderboard
firebase functions:log --limit 50
```

**Deployment Verification:**
```bash
# After deployment, verify:
# 1. Check deployment success message
# 2. Visit production URLs
# 3. Test critical features
# 4. Verify cache performance
```

### 🔍 Common Issues & Solutions

**Authentication Timing:**
```javascript
async function waitForFirebaseAuth() {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve();
        });
        setTimeout(() => {
            unsubscribe();
            resolve();
        }, 5000);
    });
}
```

**Firebase Paths (7-Segment Error):**
```javascript
// WRONG: 7 segments causes error
const path = `picks/pools/nerduniverse-2025/weeks/${week}/users/${userId}`;

// CORRECT: Use proper Firestore structure
const path = `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions`;
const docRef = doc(db, path, userId);
```

**Config Verification:**
```javascript
// Verify correct config loaded
console.assert(
    firebase.app().options.messagingSenderId === '969304790725',
    'Wrong Firebase config!'
);
```

## Deployment Workflow

### Pre-Deployment Checklist
- [ ] Tests passing
- [ ] Ghost users eliminated
- [ ] Firebase config centralized
- [ ] Security rules updated
- [ ] Functions optimized
- [ ] Cache system verified

### Deployment Steps
1. **Commit current state**: `git add . && git commit -m "Pre-deploy: Working state"`
2. **Deploy to Firebase**: `firebase deploy --only hosting,functions`
3. **Verify deployment**: Test production URLs
4. **Monitor logs**: Check for errors
5. **Performance check**: Verify <500ms targets
6. **Git push**: `git push origin main`

### Post-Deployment Verification
- [ ] All URLs responding
- [ ] Authentication working
- [ ] Cache performance <500ms
- [ ] No console errors
- [ ] Critical features functional

## Emergency Recovery

**If Deployment Breaks:**
```bash
# 1. Rollback to last working tag
git checkout SAFE-WEEKLIES  # or other known-good tag

# 2. Re-deploy
firebase deploy --only hosting,functions

# 3. Verify recovery
# Test production URLs
```

**If Config Issues:**
```bash
# Restore centralized config
git checkout main -- public/js/config/firebase-config.js
firebase deploy --only hosting
```

## Debug Patterns
```javascript
console.log('🔥 FIREBASE:', 'Initialized');
console.log('📦 FIRESTORE:', 'Query complete');
console.log('🚀 DEPLOY:', 'Success');
console.log('⚠️ CONFIG:', firebaseConfig.messagingSenderId);
```

## Performance Targets
- [ ] Cloud Functions: <500ms response
- [ ] Firestore queries: Optimized with indexes
- [ ] Hosting: CDN cache hits
- [ ] Authentication: <100ms validation
- [ ] Cache system: Sub-500ms loads
