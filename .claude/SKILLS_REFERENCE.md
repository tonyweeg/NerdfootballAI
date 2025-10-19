# NerdFootball Skills Reference Guide

**FOR CLAUDE USE**: Proactive skill invocation guide. User relies on Claude to invoke skills when appropriate.

## Skill Invocation Matrix

### 🚀 Deployment & Backup Skills

#### `nerdfootball-deploy`
**When to invoke:**
- User says "deploy", "push to production", "go live"
- After completing features and tests pass
- When user asks to "ship it" or "release"
- Before major milestones or end of session

**Triggers:**
- "deploy this"
- "push to firebase"
- "go to production"
- "ship it"
- "release the feature"

#### `triple-backup`
**When to invoke:**
- After completing major features (>1000 lines)
- Before ending a long coding session
- User says "save this" or "backup my work"
- Before architectural changes
- At natural completion points
- Every 2-3 hours during extended sessions

**Triggers:**
- "save everything"
- "backup my work"
- "protect this work"
- After major milestones completed
- Before risky refactoring

### ⚡ Performance Skills

#### `performance-audit`
**When to invoke:**
- User says "is it fast enough?"
- After performance optimizations
- Before major deployments
- User reports "it feels slow"
- Weekly/bi-weekly health checks
- After cache system changes

**Triggers:**
- "check performance"
- "is it fast?"
- "run performance tests"
- "verify speed"
- "it's slow"
- After ESPN cache changes
- After survivor pool changes

#### `speedy-code`
**When to invoke:**
- User says "make it faster" or "optimize this"
- When performance issues detected
- When refactoring slow code
- When N+1 query patterns suspected
- User mentions "lag", "slow", "timeout"

**Triggers:**
- "optimize"
- "make it faster"
- "speed this up"
- "it's too slow"
- "performance issue"
- "reduce load time"

### 📊 Data & Integration Skills

#### `espn-sync`
**When to invoke:**
- User mentions ESPN data issues
- "Stale scores" or "old data"
- Cache refresh needed
- Timezone bugs appearing
- Game status problems
- Weekly cache regeneration needed

**Triggers:**
- "ESPN data"
- "refresh cache"
- "stale scores"
- "wrong game time"
- "timezone issue"
- "game status wrong"
- "bulk cache refresh"

### 🔧 Configuration & Quality Skills

#### `config-audit`
**When to invoke:**
- Authentication breaks mysteriously
- User mentions config issues
- Before major refactoring
- Monthly health checks
- After adding new HTML pages
- User says "auth isn't working"

**Triggers:**
- "auth broken"
- "config issue"
- "wrong Firebase config"
- "check configs"
- "verify Firebase setup"
- After new page creation

#### `firebase-expert`
**When to invoke:**
- User mentions Firebase Functions, Firestore, Auth
- Deployment issues
- Database query optimization needed
- Security rules questions
- Cloud Functions debugging
- Firebase configuration questions

**Triggers:**
- "Firebase" + any problem
- "Firestore query"
- "Cloud Functions"
- "security rules"
- "database optimization"
- "Firebase deploy failed"

## Proactive Skill Usage Patterns

### Start of Session
1. Check if major work planned → Suggest `triple-backup` before starting
2. If deployment mentioned → Prime `nerdfootball-deploy`

### During Development
1. Writing performance-critical code → Keep `speedy-code` in mind
2. Working with ESPN data → Use `espn-sync` for patterns
3. Firebase operations → Reference `firebase-expert`

### End of Session
1. Major work completed → **AUTO-INVOKE** `triple-backup`
2. Feature ready → Suggest `nerdfootball-deploy`
3. Performance changes made → Suggest `performance-audit`

### Weekly Maintenance
1. Performance check → `performance-audit`
2. Config verification → `config-audit`
3. Cache health → `espn-sync`

## Skill Combination Patterns

### "Deploy Feature" Workflow
1. `performance-audit` - Verify performance targets
2. `config-audit` - Ensure configs centralized
3. `nerdfootball-deploy` - Execute deployment
4. `triple-backup` - Protect the work

### "Performance Issue" Workflow
1. `performance-audit` - Identify bottlenecks
2. `speedy-code` - Apply optimizations
3. `performance-audit` - Verify improvements
4. `nerdfootball-deploy` - Deploy fixes

### "ESPN Data Issue" Workflow
1. `espn-sync` - Diagnose cache/API issue
2. `speedy-code` - Optimize if needed
3. `performance-audit` - Verify <500ms target
4. `triple-backup` - Save the fix

### "End of Day" Workflow
1. `triple-backup` - Save all work (LOCAL → GITHUB → FIREBASE)
2. Create checkpoint file if major work

## Skill Invocation Examples

### Example 1: User says "deploy this feature"
```
Claude thinks:
1. Feature complete? Check tests
2. Invoke: /skill nerdfootball-deploy
3. After deploy: Invoke /skill triple-backup
```

### Example 2: User says "the leaderboard is slow"
```
Claude thinks:
1. Performance issue detected
2. Invoke: /skill performance-audit (measure current)
3. Invoke: /skill speedy-code (optimization patterns)
4. After fix: Invoke /skill performance-audit (verify)
```

### Example 3: User says "ESPN scores are wrong"
```
Claude thinks:
1. ESPN data issue
2. Invoke: /skill espn-sync (cache/timezone debugging)
3. After fix: Verify <500ms with performance-audit
```

### Example 4: End of 2-hour session with major work
```
Claude thinks:
1. Major work completed (survivor pool refactor)
2. AUTO-INVOKE: /skill triple-backup (mandatory)
3. Create checkpoint file: WHERE-WE-LEFT-OFF-SURVIVOR.md
```

### Example 5: User says "auth keeps breaking"
```
Claude thinks:
1. Authentication issue - likely config
2. Invoke: /skill config-audit (scan for hardcoded configs)
3. Invoke: /skill firebase-expert (auth debugging patterns)
```

## When NOT to Invoke Skills

- Trivial questions (don't need skill overhead)
- Simple bug fixes (<10 lines)
- Documentation-only changes
- User explicitly says "don't use skills"

## Skill Priority Hierarchy

**CRITICAL (Always use):**
- `triple-backup` after major work
- `nerdfootball-deploy` for production deployment

**HIGH (Use when relevant):**
- `performance-audit` after performance changes
- `config-audit` when auth issues appear
- `espn-sync` for ESPN data problems

**MEDIUM (Use as helpful):**
- `speedy-code` for optimization guidance
- `firebase-expert` for Firebase questions

## Claude's Responsibility

1. **Monitor user intent** - Detect when skill would help
2. **Invoke proactively** - Don't wait for user to remember
3. **Explain briefly** - "I'm using the X skill to help with Y"
4. **Combine appropriately** - Use multiple skills for complex tasks
5. **AUTO-BACKUP** - Always invoke `triple-backup` after major work

## Quick Reference Card

| User Says | Invoke Skill |
|-----------|--------------|
| "deploy" / "ship it" | `nerdfootball-deploy` |
| "save" / "backup" / (end of session) | `triple-backup` |
| "slow" / "optimize" | `speedy-code` → `performance-audit` |
| "ESPN wrong" / "cache stale" | `espn-sync` |
| "auth broken" / "config issue" | `config-audit` |
| "Firebase [problem]" | `firebase-expert` |
| "is it fast?" / "check speed" | `performance-audit` |

## Remember

**User forgets skills exist → Claude remembers and invokes them**

This is a **proactive assistance pattern** - Claude should use skills without being asked when the situation clearly calls for it.
