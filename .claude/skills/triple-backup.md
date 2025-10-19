# Triple-Backup Protocol Skill

Execute the documented TRIPLE-BACKUP WORK PROTECTION PROTOCOL for NerdFootball.

## Protocol Philosophy

**"Your work is now triple-protected: Local Git → Remote GitHub → Firebase Production"**

## When to Execute Triple-Backup

Execute ALWAYS after:
- ✅ Completing a major feature or set of patterns
- ✅ Before ending a long coding session
- ✅ When user requests a backup/save
- ✅ After generating substantial code (>1000 lines)
- ✅ Before making architectural changes
- ✅ At natural completion points (all tests passing, deployed, working)

## Triple-Backup Execution

### Step 1: Local Git Commit

```bash
git add .
git status  # Review what's being committed

git commit -m "[JIRA-ID if applicable]: [Detailed description]

- [Specific changes made]
- [Files affected]
- [Deployment status]
- [Features completed]

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Commit Message Guidelines:**
- Include JIRA ticket if available (e.g., `AF-456: Add PatternDNA library`)
- List specific changes in bullet points
- Note deployment status
- Mention features completed
- Keep description clear and actionable

### Step 2: Remote GitHub Push

```bash
git push origin main  # Or feature branch

# Verify push succeeded
git log -1
# Check GitHub web interface to confirm
```

**Push Verification:**
- Confirm push completed without errors
- Check GitHub repository for latest commit
- Verify commit appears in history
- Note commit hash for reference

### Step 3: Firebase Production Deploy

```bash
firebase deploy --only hosting,functions

# OR deploy separately:
# firebase deploy --only hosting
# firebase deploy --only functions

# Verify deployment
# Check deployment URLs and test in browser
```

**Deployment Verification:**
- Note deployment URLs from output
- Test critical production pages
- Verify no errors in browser console
- Confirm features working as expected

## Backup Verification Report

After completing all three backups, provide this formatted report to user:

```
✅ ALL WORK SAVED AND BACKED UP!

Your work is now triple-protected:

1. ✅ Local Git Commit
   Commit: [commit hash]
   Message: [commit description]

2. ✅ Remote GitHub Push
   Branch: [branch name]
   Repo: https://github.com/tonyweeg/NerdfootballAI
   Status: Successfully pushed

3. ✅ Firebase Production Deploy
   Hosting: https://nerdfootball.web.app
   Functions: [list deployed functions]
   Status: Deployment successful

What's Protected:
- [List of major files/features added]
- [Number of patterns/components created]
- [Lines of code added/modified]
- [Performance improvements achieved]

Recovery Strategy:
If anything happens, you can:
1. `git pull` to restore all files from GitHub
2. Read checkpoint files to resume work
3. All deployed features remain live on Firebase
4. Rollback to previous commit if needed

You're 100% safe! No work will be lost. 🎯
```

## Recovery Documentation

Create checkpoint files for large work sessions:

**Location:** `docs/WHERE-WE-LEFT-OFF-[FEATURE].md`

**Template:**
```markdown
# Checkpoint: [Feature Name]

**Date:** [Current date]
**Status:** [In Progress / Complete]
**Commit:** [commit hash]

## What Was Completed
- [Feature/pattern completed]
- [Files created/modified]
- [Tests written]
- [Performance improvements]

## Current State
- [Exact state of feature]
- [What's working]
- [What's tested]
- [What's deployed]

## Next Steps
1. [Next task to complete]
2. [Dependencies to address]
3. [Testing to perform]
4. [Documentation to update]

## Context for Resuming
- [Important decisions made]
- [Patterns established]
- [Edge cases to remember]
- [Known issues to address]

## Recovery Commands
```bash
git checkout [commit-hash]
firebase deploy --only hosting,functions
```

## Test URLs
- [List of URLs to test feature]
```

## Triple-Backup Checklist

### Pre-Backup
- [ ] All work completed and tested
- [ ] No uncommitted changes that should be excluded
- [ ] `.gitignore` properly configured (`.env` excluded)
- [ ] No sensitive data in commits

### Backup 1: Git Commit
- [ ] `git add .` executed
- [ ] `git status` reviewed
- [ ] Commit message follows guidelines
- [ ] Commit created successfully
- [ ] Commit hash noted

### Backup 2: GitHub Push
- [ ] `git push` executed
- [ ] Push succeeded without errors
- [ ] GitHub shows latest commit
- [ ] Remote repository updated

### Backup 3: Firebase Deploy
- [ ] Deploy command executed
- [ ] Deployment succeeded
- [ ] Production URLs tested
- [ ] Features verified working
- [ ] Performance targets met

### Post-Backup
- [ ] Backup Verification Report generated
- [ ] Checkpoint file created (if major work)
- [ ] User notified of successful backup
- [ ] Recovery strategy documented

## Common Issues & Solutions

**Issue: Git push rejected (behind remote)**
```bash
git pull origin main
# Resolve conflicts if any
git push origin main
```

**Issue: Merge conflicts on pull**
```bash
# Resolve conflicts in files
git add .
git commit -m "Merge: Resolved conflicts"
git push origin main
```

**Issue: Firebase deploy fails**
```bash
# Check Firebase login
firebase login

# Re-deploy
firebase deploy --only hosting,functions
```

**Issue: Sensitive data accidentally committed**
```bash
# Remove from history (dangerous!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/file" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (ONLY if necessary)
git push origin --force --all
```

## Protection Layers

### Layer 1: Local Git Repository
- **Purpose**: Local version control and history
- **Recovery**: `git checkout [commit]`
- **Benefit**: Instant rollback to any previous state

### Layer 2: Remote GitHub Repository
- **Purpose**: Off-machine backup and collaboration
- **Recovery**: `git clone` or `git pull`
- **Benefit**: Survives local machine failure

### Layer 3: Firebase Production
- **Purpose**: Live deployment and user-accessible
- **Recovery**: Re-deploy from git
- **Benefit**: Features remain live even if code lost

## Quick Backup Commands

For experienced users, quick execution:

```bash
# Triple-backup one-liner
git add . && \
git commit -m "Backup: [description]" && \
git push origin main && \
firebase deploy --only hosting,functions
```

**⚠️ Warning:** Only use one-liner after thorough testing!

## Debug Patterns
```javascript
console.log('💾 BACKUP:', 'Starting triple-backup');
console.log('✅ GIT:', 'Committed locally');
console.log('✅ GITHUB:', 'Pushed to remote');
console.log('✅ FIREBASE:', 'Deployed to production');
```

## Success Criteria

Triple-backup is complete when:
1. ✅ Local git commit created with descriptive message
2. ✅ Changes pushed to GitHub successfully
3. ✅ Firebase deployment succeeded
4. ✅ Production verified working
5. ✅ Backup Verification Report generated
6. ✅ Checkpoint file created (if major work)
7. ✅ User notified of protection status

## Diamond Level Standard

**"Every significant piece of work deserves triple protection. Never lose work. Always have a path back."**
