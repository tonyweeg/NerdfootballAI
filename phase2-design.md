# Phase 2: Multi-Pool Infrastructure Design

## Data Model Architecture

### 1. Pool Structure
```
artifacts/nerdfootball/pools/{pool-id}/
├── metadata/
│   ├── config.json          # Pool settings (type, name, rules)
│   ├── members.json         # User membership and roles  
│   └── invites.json         # Active invite links
├── data/                    # Existing data structure
│   ├── nerdfootball_picks/
│   ├── nerdfootball_results/
│   ├── nerdfootball_users/
│   ├── nerdSurvivor_picks/
│   └── nerdSurvivor_status/
└── analytics/               # Pool-specific stats
    └── engagement.json
```

### 2. User Pool Membership
```
artifacts/nerdfootball/users/{user-id}/
├── profile.json             # User profile data
├── pools.json              # Pool memberships with roles
└── preferences.json        # UI and notification settings
```

### 3. Pool Configuration Schema
```json
{
  "poolId": "nerdfootball-2025",
  "name": "NerdFootball 2025 Championship", 
  "description": "Official 2025 season pool",
  "type": "both",              // "confidence", "survivor", "both"
  "creator": "user-uid",
  "created": "2025-01-15T10:00:00Z",
  "settings": {
    "maxMembers": 50,
    "joinType": "invite",      // "open", "invite", "private"
    "confidenceEnabled": true,
    "survivorEnabled": true,
    "weeklyReminders": true
  },
  "status": "active",          // "active", "completed", "paused"
  "season": "2025"
}
```

## User Experience Flow

### 1. New User Onboarding
- **Step 1**: Account creation with human verification
- **Step 2**: Join first pool (via invite or discovery)
- **Step 3**: Guided tour of pool features
- **Step 4**: Profile completion

### 2. Existing User Pool Management
- **Pool Switcher**: Dropdown in header for active pools
- **Pool Dashboard**: Overview of all joined pools
- **Pool Creation**: Wizard-style pool setup
- **Invitation Management**: Send/manage invite links

### 3. Pool Discovery & Joining
- **Invite Links**: `nerdfootball.web.app/join/{invite-code}`
- **Pool Browser**: Search public/discoverable pools
- **Join Flow**: Preview → Confirm → Onboard

## UI/UX Design Patterns

### Inclusive Design Elements
1. **Clear Visual Hierarchy**: Consistent heading structure (h1→h6)
2. **High Contrast**: WCAG AA compliant color combinations
3. **Keyboard Navigation**: Full keyboard accessibility
4. **Screen Reader Support**: Proper ARIA labels and landmarks
5. **Mobile Touch Targets**: Minimum 44px touch targets
6. **Loading States**: Clear feedback for async operations
7. **Error Handling**: User-friendly error messages with recovery options

### Responsive Breakpoints
- **Mobile**: 320px - 767px (single column, stack elements)
- **Tablet**: 768px - 1023px (two column where appropriate)
- **Desktop**: 1024px+ (full multi-column layouts)

## Technical Implementation Strategy

### Phase 2A: Foundation (Week 1)
- [ ] User pool membership system
- [ ] Pool switcher UI component
- [ ] Enhanced user profile system

### Phase 2B: Pool Management (Week 2)
- [ ] Pool creation wizard
- [ ] Pool settings management
- [ ] Member management interface

### Phase 2C: Social Features (Week 3)
- [ ] Invite link system
- [ ] Pool discovery
- [ ] Join flow implementation

### Phase 2D: Polish & Testing (Week 4)
- [ ] Accessibility audit
- [ ] Mobile optimization
- [ ] Performance testing
- [ ] User acceptance testing

## Success Metrics
- **Usability**: Users can create and join pools within 3 minutes
- **Accessibility**: WCAG AA compliance verified
- **Performance**: Pool switching < 1 second load time
- **Adoption**: 90% of existing users successfully transition to multi-pool system