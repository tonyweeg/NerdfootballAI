# Season Configuration Centralization Design

**Date:** 2026-08-07
**Status:** Approved
**Scope:** Eliminate 207 hardcoded "2025" values across 38+ HTML files

## Problem Statement

NerdFootball has 207 hardcoded "2025" references scattered across 38+ HTML files:
- 84 pool path references (`nerduniverse-2025`)
- 17 season start date calculations (`new Date('2025-09-04')`)
- 6 display text instances (`WEEK X • 2025`)
- 22 logo URLs (out of scope - branding, not config)
- Various other references

This makes annual season transitions error-prone and time-consuming.

## Solution

Create a centralized `/public/js/config/season-config.js` that serves as the single source of truth for all season-related data, paths, utilities, and formatters.

## Design

### Core Data Structure

```javascript
const SEASON_CONFIG = {
    // Core season data (updated by scraper)
    year: 2026,
    seasonStartDate: '2026-09-09T20:20:00Z',
    seasonEndDate: '2026-01-03T23:59:59Z',
    totalWeeks: 18,

    // Pool identification
    poolName: 'nerduniverse-2026',
    poolId: 'nerduniverse-2026',

    // ESPN integration
    espnScheduleUrlTemplate: 'https://www.espn.com/nfl/schedule/_/week/{WEEK}/year/{YEAR}/seasontype/2',
    scheduleJsonFile: 'nfl_2026_schedule_raw.json',
};
```

### Path Builders

```javascript
paths: {
    // Pool-level paths
    poolRoot: () =>
        `artifacts/nerdfootball/pools/${SEASON_CONFIG.poolId}`,

    poolMembers: () =>
        `artifacts/nerdfootball/pools/${SEASON_CONFIG.poolId}/metadata/members`,

    aiCache: () =>
        `artifacts/nerdfootball/pools/${SEASON_CONFIG.poolId}/cache/latest-ai-intel-sheet`,

    scoringUser: (userId) =>
        `artifacts/nerdfootball/pools/${SEASON_CONFIG.poolId}/scoring-users/${userId}`,

    gridCache: (week) =>
        `artifacts/nerdfootball/pools/${SEASON_CONFIG.poolId}/cache/grid-week-${week}`,

    // Public data paths
    picks: (week, userId) =>
        `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions/${userId}`,

    picksWeek: (week) =>
        `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions`,

    results: (week) =>
        `artifacts/nerdfootball/public/data/nerdfootball_results/${week}`,

    survivorPicks: () =>
        `artifacts/nerdfootball/public/data/nerdSurvivor_picks`,

    // Global cache
    espnCache: () =>
        `cache/espn_current_data`,
}
```

### Utility Functions

```javascript
utils: {
    getCurrentWeek: () => {
        const now = new Date();
        const seasonStart = new Date(SEASON_CONFIG.seasonStartDate);
        if (now < seasonStart) return 1;
        const diffMs = now - seasonStart;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const week = Math.ceil((diffDays + 1) / 7);
        return Math.min(SEASON_CONFIG.totalWeeks, Math.max(1, week));
    },

    hasWeekStarted: (week) => {
        const now = new Date();
        const seasonStart = new Date(SEASON_CONFIG.seasonStartDate);
        const weekStart = new Date(seasonStart.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
        return now >= weekStart;
    },

    isSeasonActive: () => {
        const now = new Date();
        const start = new Date(SEASON_CONFIG.seasonStartDate);
        const end = new Date(SEASON_CONFIG.seasonEndDate);
        return now >= start && now <= end;
    },

    getEspnScheduleUrl: (week) => {
        return SEASON_CONFIG.espnScheduleUrlTemplate
            .replace('{WEEK}', week)
            .replace('{YEAR}', SEASON_CONFIG.year);
    },

    getAllEspnScheduleUrls: () => {
        return Array.from({ length: SEASON_CONFIG.totalWeeks }, (_, i) =>
            SEASON_CONFIG.utils.getEspnScheduleUrl(i + 1)
        );
    },
}
```

### Display Formatters

```javascript
format: {
    weekDisplay: (week = null) => {
        const w = week ?? SEASON_CONFIG.utils.getCurrentWeek();
        return `WEEK ${w} • ${SEASON_CONFIG.year}`;
    },

    seasonLabel: () => {
        return `${SEASON_CONFIG.year} NFL Season`;
    },

    weekLabel: (week = null) => {
        const w = week ?? SEASON_CONFIG.utils.getCurrentWeek();
        return `Week ${w}, ${SEASON_CONFIG.year}`;
    },

    poolDisplay: () => {
        return SEASON_CONFIG.poolName;
    },
}
```

### Export Pattern

```javascript
// ES6 export
export { SEASON_CONFIG };
export const getSeasonConfig = () => SEASON_CONFIG;

// Global export for compat scripts
if (typeof window !== 'undefined') {
    window.SEASON_CONFIG = SEASON_CONFIG;
    window.getSeasonConfig = () => SEASON_CONFIG;
}
```

## Scraper Integration

The ESPN schedule scraper will be updated to:
1. Fetch Week 1 schedule and extract `seasonStartDate` from first game
2. Fetch Week 18 schedule and extract `seasonEndDate` from last game
3. Update `season-config.js` with extracted values
4. Generate `nfl_{YEAR}_schedule_raw.json`

**Annual workflow:**
```bash
node espn-schedule-scraper.js --year=2026
```

## Migration Strategy

### Utility Files to Update First

1. **firebase-cache.js** (line 262) - Has hardcoded `nerduniverse-2025` in cache registration:
```javascript
// Before
cacheManager.registerCache(
    'ai-predictions',
    'artifacts/nerdfootball/pools/nerduniverse-2025/cache/latest-ai-intel-sheet',
    15
);

// After
cacheManager.registerCache(
    'ai-predictions',
    SEASON_CONFIG.paths.aiCache(),
    15
);
```

### HTML Files to Update (38 files with pool paths)

Priority order:
1. Core user-facing pages (5 files)
2. Admin tools (15 files)
3. Debug/test harnesses (18 files)

### Migration Pattern

```javascript
// Before
const poolMembersPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members';
const seasonStart = new Date('2025-09-04');
document.getElementById('week-display').textContent = `WEEK ${week} • 2025`;

// After
import { SEASON_CONFIG } from './js/config/season-config.js';

const poolMembersPath = SEASON_CONFIG.paths.poolMembers();
const seasonStart = new Date(SEASON_CONFIG.seasonStartDate);
document.getElementById('week-display').textContent = SEASON_CONFIG.format.weekDisplay();
```

## Out of Scope

- Logo URLs (`nerd-2025.png`) - branding assets, not season config
- Historical data migration - existing 2025 data stays in `nerduniverse-2025`
- Firestore path restructuring - keeping `nerduniverse-{YEAR}` pattern

## Success Criteria

1. Single config file controls all season-related values
2. Zero hardcoded year references in active HTML files
3. Annual season transition requires only:
   - Run scraper with new year
   - Deploy updated config
4. All existing functionality preserved

## Testing Strategy

1. Create config file with 2025 values (current season)
2. Update one file at a time, verify functionality
3. Run existing test suites after each batch
4. Full regression test before deployment

## Rollback Plan

If issues arise:
- Config file can be reverted via git
- Individual files can fall back to hardcoded values temporarily
- No data migration means no data rollback needed
