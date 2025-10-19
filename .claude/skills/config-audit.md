# Config Audit Skill

Firebase configuration verification specialist ensuring centralized config usage across all NerdFootball files.

## Configuration Philosophy

**"One source of truth. Zero hardcoded configs. 100% centralized."**

## Critical Firebase Configuration Standards

### ✅ Correct Configuration (REFERENCE ONLY)

**Standard Firebase Config Values:**
- **Project ID:** `nerdfootball`
- **Sender ID:** `969304790725` ⚠️ CRITICAL IDENTIFIER
- **App ID:** `1:969304790725:web:892df38db0b0e62bde02ac`
- **Storage Bucket:** `nerdfootball.appspot.com`
- **Auth Domain:** `nerdfootball.firebaseapp.com`
- **API Key:** `AIzaSyDAF1MbAhL2uPIVUGMDlXvCqtknUUCX5Gw`

### 🚫 Wrong Configuration (NEVER USE)

**Indicators of wrong config:**
- Sender ID: `631080493141` ❌
- App ID: `1:631080493141:web:e7c5dde9013b0b4b60fe49` ❌
- Any other messagingSenderId ❌
- Any other project ID ❌

## Centralized Configuration Files

### Required Config Files

**ES6 Module Config:**
- **Location:** `/public/js/config/firebase-config.js`
- **Usage:** `import { getFirebaseConfig } from './js/config/firebase-config.js'`

**Compat SDK Config:**
- **Location:** `/public/js/config/firebase-config-compat.js`
- **Usage:** `<script src="./js/config/firebase-config-compat.js"></script>`

## Config Audit Execution

### 1. Scan for Hardcoded Firebase Configs

**Search Pattern:**
```bash
# Search for hardcoded Firebase config objects
grep -r "messagingSenderId" public/ --include="*.html" --include="*.js" | \
  grep -v "firebase-config" | \
  grep -v "firebase-config-compat"

# Search for API key hardcoding
grep -r "AIzaSy" public/ --include="*.html" --include="*.js" | \
  grep -v "firebase-config" | \
  grep -v "firebase-config-compat"

# Search for wrong project references
grep -r "631080493141" public/
```

**Expected Result:** No matches outside centralized config files

### 2. Verify Centralized Import Usage

**Correct ES6 Import Pattern:**
```javascript
import { getFirebaseConfig } from './js/config/firebase-config.js';
const firebaseConfig = getFirebaseConfig();
firebase.initializeApp(firebaseConfig);
```

**Correct Compat SDK Pattern:**
```html
<script src="./js/config/firebase-config-compat.js"></script>
<script>
    const firebaseConfig = window.getFirebaseConfig();
    firebase.initializeApp(firebaseConfig);
</script>
```

**Search for Correct Usage:**
```bash
# ES6 imports
grep -r "import.*getFirebaseConfig" public/

# Compat SDK imports
grep -r "firebase-config-compat.js" public/

# window.getFirebaseConfig usage
grep -r "window.getFirebaseConfig()" public/
```

### 3. Verify Firebase Initialization

**Correct Initialization Pattern:**
```javascript
// Check for proper initialization
if (!firebase.apps.length) {
    const config = getFirebaseConfig();
    firebase.initializeApp(config);
} else {
    firebase.app(); // Use existing
}
```

**Search for Initialization:**
```bash
# Find all Firebase initialization calls
grep -r "firebase.initializeApp" public/

# Verify they use centralized config
grep -r "firebase.initializeApp(getFirebaseConfig" public/
grep -r "firebase.initializeApp(window.getFirebaseConfig" public/
```

### 4. Check for Wrong messagingSenderId

**Critical Verification:**
```bash
# Find any references to wrong sender ID
grep -r "631080493141" public/

# Verify correct sender ID in centralized configs
grep -r "969304790725" public/js/config/
```

**Expected Results:**
- ✅ `969304790725` found ONLY in `/public/js/config/`
- ❌ `631080493141` found NOWHERE

## Config Audit Report Template

```markdown
# Firebase Config Audit Report
**Date:** [Current date]
**Auditor:** Claude Code - Config Audit Skill

## Executive Summary
- ✅ [X] files using centralized config
- ⚠️ [Y] files with hardcoded configs
- 🔴 [Z] files with WRONG config

## Centralized Config Status

### Config Files Present
- [ ] `/public/js/config/firebase-config.js` exists
- [ ] `/public/js/config/firebase-config-compat.js` exists
- [ ] Both contain correct messagingSenderId: `969304790725`

### Centralized Config Usage
- **ES6 Imports:** [count] files
- **Compat SDK:** [count] files
- **Total Compliant:** [count] files

## Issues Found

### 🔴 CRITICAL: Hardcoded Configs
Files with hardcoded Firebase configs:
1. `[filepath]` - Line [number]
   - **messagingSenderId:** [value]
   - **Action Required:** Replace with centralized import

### ⚠️ WARNING: Wrong Configuration
Files with incorrect config values:
1. `[filepath]` - Line [number]
   - **Wrong Sender ID:** 631080493141
   - **Action Required:** URGENT - Replace immediately

### ✅ COMPLIANT: Centralized Usage
Files correctly using centralized config:
1. `[filepath]` - Using ES6 import
2. `[filepath]` - Using compat SDK

## Verification Commands

### Verify Correct Config
```bash
grep -r "969304790725" public/js/config/
```
**Expected:** Found in both config files

### Check for Wrong Config
```bash
grep -r "631080493141" public/
```
**Expected:** No matches

### Find Hardcoded Configs
```bash
grep -r "messagingSenderId" public/ --include="*.html" --include="*.js" | \
  grep -v "firebase-config"
```
**Expected:** No matches outside config files

## Remediation Steps

### For Hardcoded Configs:
1. Identify the file with hardcoded config
2. Remove hardcoded config object
3. Add centralized import
4. Test authentication still works
5. Commit fix

### For Wrong Configs:
1. **URGENT:** Identify affected files
2. Replace with centralized config immediately
3. Test authentication thoroughly
4. Verify messagingSenderId is correct
5. Deploy fix ASAP

## Recommendations
1. [Config improvement suggestion]
2. [Centralization opportunity]
3. [Technical debt to address]

## Action Items
- [ ] [Critical config fix required]
- [ ] [File to migrate to centralized config]
- [ ] [Verification task]
```

## Automated Config Audit Script

**Script: `scripts/audit-firebase-config.js`**
```javascript
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function auditFirebaseConfig() {
    console.log('🔍 Starting Firebase Config Audit...\n');

    // 1. Check centralized config files exist
    const configFiles = [
        'public/js/config/firebase-config.js',
        'public/js/config/firebase-config-compat.js'
    ];

    console.log('📦 Checking Centralized Config Files:');
    configFiles.forEach(file => {
        const exists = fs.existsSync(file);
        console.log(`${exists ? '✅' : '❌'} ${file}`);
    });

    // 2. Search for hardcoded configs
    console.log('\n🔍 Scanning for Hardcoded Configs:');
    try {
        const hardcoded = execSync(
            'grep -r "messagingSenderId" public/ --include="*.html" --include="*.js" | grep -v "firebase-config"',
            { encoding: 'utf-8' }
        );
        console.log('⚠️ Found hardcoded configs:\n', hardcoded);
    } catch (e) {
        console.log('✅ No hardcoded configs found');
    }

    // 3. Search for wrong config
    console.log('\n🚨 Checking for Wrong Config:');
    try {
        const wrong = execSync(
            'grep -r "631080493141" public/',
            { encoding: 'utf-8' }
        );
        console.log('🔴 CRITICAL - Wrong config found:\n', wrong);
    } catch (e) {
        console.log('✅ No wrong config found');
    }

    // 4. Verify correct config in centralized files
    console.log('\n✅ Verifying Correct Config:');
    try {
        const correct = execSync(
            'grep -r "969304790725" public/js/config/',
            { encoding: 'utf-8' }
        );
        console.log('✅ Correct messagingSenderId found:\n', correct);
    } catch (e) {
        console.log('🔴 CRITICAL - Correct config not found!');
    }

    // 5. Count centralized usage
    console.log('\n📊 Centralized Config Usage:');
    try {
        const es6Imports = execSync(
            'grep -r "import.*getFirebaseConfig" public/ | wc -l',
            { encoding: 'utf-8' }
        ).trim();
        console.log(`ES6 Imports: ${es6Imports} files`);

        const compatUsage = execSync(
            'grep -r "window.getFirebaseConfig()" public/ | wc -l',
            { encoding: 'utf-8' }
        ).trim();
        console.log(`Compat SDK: ${compatUsage} files`);
    } catch (e) {
        console.log('⚠️ Could not count usage');
    }

    console.log('\n✅ Config Audit Complete\n');
}

auditFirebaseConfig();
```

**Run Audit:**
```bash
node scripts/audit-firebase-config.js
```

## Migration Guide: Hardcoded → Centralized

### For HTML Files (Compat SDK)

**Before (Hardcoded):**
```html
<script>
    const firebaseConfig = {
        apiKey: "AIzaSy...",
        authDomain: "nerdfootball.firebaseapp.com",
        projectId: "nerdfootball",
        storageBucket: "nerdfootball.appspot.com",
        messagingSenderId: "969304790725",
        appId: "1:969304790725:web:..."
    };
    firebase.initializeApp(firebaseConfig);
</script>
```

**After (Centralized):**
```html
<script src="./js/config/firebase-config-compat.js"></script>
<script>
    const firebaseConfig = window.getFirebaseConfig();
    firebase.initializeApp(firebaseConfig);
</script>
```

### For JavaScript Files (ES6 Modules)

**Before (Hardcoded):**
```javascript
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "nerdfootball.firebaseapp.com",
    projectId: "nerdfootball",
    storageBucket: "nerdfootball.appspot.com",
    messagingSenderId: "969304790725",
    appId: "1:969304790725:web:..."
};
firebase.initializeApp(firebaseConfig);
```

**After (Centralized):**
```javascript
import { getFirebaseConfig } from './js/config/firebase-config.js';

const firebaseConfig = getFirebaseConfig();
firebase.initializeApp(firebaseConfig);
```

## Common Config Issues

**Issue: Authentication breaks after config change**
- **Cause:** Wrong messagingSenderId or config mismatch
- **Fix:** Verify using `969304790725`, clear browser cache, re-deploy

**Issue: "Firebase app named '[DEFAULT]' already exists"**
- **Cause:** Multiple initialization attempts
- **Fix:** Check for existing app before initializing

**Issue: Config not found in centralized files**
- **Cause:** Files don't exist or wrong path
- **Fix:** Verify centralized config files exist at correct paths

**Issue: Import statement fails**
- **Cause:** Wrong import path or module type
- **Fix:** Verify path relative to importing file

## Success Criteria

Config audit is successful when:
1. ✅ Centralized config files exist and have correct values
2. ✅ No hardcoded configs outside centralized files
3. ✅ No wrong messagingSenderId anywhere
4. ✅ All files use centralized import pattern
5. ✅ Config audit report generated
6. ✅ Migration plan provided for non-compliant files
7. ✅ User notified of audit results

## Debug Patterns
```javascript
console.log('🔍 CONFIG_AUDIT:', 'Starting audit');
console.log('✅ CENTRALIZED:', 'Config file found');
console.log('⚠️ HARDCODED:', 'Found in file.html:42');
console.log('🔴 WRONG_CONFIG:', 'messagingSenderId mismatch');
```

## Diamond Level Standard

**"One Firebase config. One source of truth. Zero exceptions."**
