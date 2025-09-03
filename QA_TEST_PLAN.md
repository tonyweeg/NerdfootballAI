# NerdFootball AI v2.0 - Comprehensive QA Test Plan

## Overview
This document outlines comprehensive testing procedures for the NerdFootball AI NFL pick'em application hosted at https://nerdfootball.web.app.

## Critical Focus Areas (Recent Changes)
1. **Per-game pick validation** - picks locked individually based on game kickoff times
2. **Pick invalidation system** - rejection of submissions after game start
3. **Email confirmation system** - pick submission confirmations
4. **Cache optimization** - faster loading and latest code versions
5. **Service worker** - update prompts for new versions

## Test Plan Structure

### 1. Authentication System Testing

#### 1.1 Email/Password Authentication
- **Test Case 1.1.1**: Valid email/password login
  - Expected: Successful authentication and redirect to main app
  - Test with multiple valid accounts
  
- **Test Case 1.1.2**: Invalid credentials
  - Expected: Clear error messages for wrong password/email
  - Test various invalid combinations
  
- **Test Case 1.1.3**: Password reset functionality
  - Expected: Password reset email sent and functional
  
- **Test Case 1.1.4**: Account registration
  - Expected: New account creation with proper validation
  - Test password confirmation matching
  - Test duplicate email handling

#### 1.2 Google OAuth Integration
- **Test Case 1.2.1**: Google Sign-In flow
  - Expected: OAuth popup, successful authentication
  - Test account linking for existing email accounts
  
- **Test Case 1.2.2**: Account linking
  - Expected: Proper linking of Google account to existing email account
  - Test conflict resolution when email already exists

#### 1.3 Profile Management
- **Test Case 1.3.1**: Email change functionality
  - Expected: Email verification process, Firestore update
  - Test pending email state management
  
- **Test Case 1.3.2**: Google account linking/unlinking
  - Expected: Proper association/disassociation of Google account

### 2. Picks Management System Testing

#### 2.1 Per-Game Pick Validation
- **Test Case 2.1.1**: Pick submission before game start
  - Expected: Successful submission and save
  - Test with various confidence point combinations
  
- **Test Case 2.1.2**: Pick submission after game start
  - Expected: Rejection with clear error message
  - Test per-game locking (not all games locked at once)
  
- **Test Case 2.1.3**: Individual game locking
  - Expected: Games lock individually based on kickoff times
  - Test mixed states (some locked, some available)

#### 2.2 Confidence Points System
- **Test Case 2.2.1**: Valid confidence point assignment
  - Expected: Unique points 1-16 (or current week's game count)
  - Test duplicate point prevention
  
- **Test Case 2.2.2**: Confidence point validation
  - Expected: Proper validation of point ranges and uniqueness
  
- **Test Case 2.2.3**: Points adjustment for locked games
  - Expected: Proper handling when games become locked

#### 2.3 Real-Time Saving
- **Test Case 2.3.1**: Auto-save functionality
  - Expected: Picks saved automatically with visual feedback
  - Test save status indicators
  
- **Test Case 2.3.2**: Network interruption handling
  - Expected: Graceful handling of connection issues
  - Test retry mechanisms

#### 2.4 Pick Reset Functionality
- **Test Case 2.4.1**: Reset available picks
  - Expected: Only unlocked games reset
  - Test confirmation dialog

### 3. Email Confirmation System Testing

#### 3.1 Pick Submission Confirmations
- **Test Case 3.1.1**: Email generation on pick submission
  - Expected: Email confirmation logged to console (current implementation)
  - Test email content and formatting
  
- **Test Case 3.1.2**: Email delivery testing
  - Expected: Proper email service integration when implemented

### 4. Leaderboard Systems Testing

#### 4.1 Weekly Leaderboards
- **Test Case 4.1.1**: Weekly ranking calculation
  - Expected: Accurate point calculations and rankings
  - Test with various scenarios
  
- **Test Case 4.1.2**: Real-time updates
  - Expected: Leaderboard updates as games conclude

#### 4.2 Season Leaderboards
- **Test Case 4.2.1**: Season-long point accumulation
  - Expected: Accurate cumulative scoring
  - Test historical week integration

#### 4.3 Display and Navigation
- **Test Case 4.3.1**: Top 10 + user position display
  - Expected: User position shown even if outside top 10
  - Test edge cases (ties, etc.)

### 5. Admin Functions Testing

#### 5.1 User Management
- **Test Case 5.1.1**: Remove users completely
  - Expected: Complete user data removal
  - Test admin-only access
  
- **Test Case 5.1.2**: Duplicate user cleanup
  - Expected: Proper identification and cleanup of duplicates

#### 5.2 Game Results Entry
- **Test Case 5.2.1**: Result entry interface
  - Expected: Accurate game result recording
  - Test validation of results

#### 5.3 Week Management
- **Test Case 5.3.1**: Week selection and navigation
  - Expected: Proper week switching functionality
  - Test historical week access

### 6. UI/UX Responsiveness Testing

#### 6.1 Cross-Browser Compatibility
- **Test Case 6.1.1**: Chrome compatibility
- **Test Case 6.1.2**: Firefox compatibility
- **Test Case 6.1.3**: Safari compatibility
- **Test Case 6.1.4**: Edge compatibility

#### 6.2 Mobile Responsiveness
- **Test Case 6.2.1**: Mobile phone layout
- **Test Case 6.2.2**: Tablet layout
- **Test Case 6.2.3**: Touch interactions

#### 6.3 Visual Elements
- **Test Case 6.3.1**: Team helmet logos display
- **Test Case 6.3.2**: Game time formatting
- **Test Case 6.3.3**: Lock status indicators
- **Test Case 6.3.4**: Hover effects functionality

### 7. Performance and Caching Testing

#### 7.1 Service Worker Functionality
- **Test Case 7.1.1**: Service worker registration
- **Test Case 7.1.2**: Update notification system
- **Test Case 7.1.3**: Cache management

#### 7.2 Loading Performance
- **Test Case 7.2.1**: Initial page load times
- **Test Case 7.2.2**: Subsequent navigation speed
- **Test Case 7.2.3**: Asset caching effectiveness

#### 7.3 Data Loading
- **Test Case 7.3.1**: NFL schedule data loading
- **Test Case 7.3.2**: User picks data retrieval
- **Test Case 7.3.3**: Leaderboard data loading

### 8. Error Handling and Edge Cases

#### 8.1 Network Conditions
- **Test Case 8.1.1**: Offline functionality
- **Test Case 8.1.2**: Poor network conditions
- **Test Case 8.1.3**: Connection timeout handling

#### 8.2 Data Validation
- **Test Case 8.2.1**: Invalid input handling
- **Test Case 8.2.2**: Malformed data responses
- **Test Case 8.2.3**: Security boundary testing

### 9. Security Testing

#### 9.1 Authentication Security
- **Test Case 9.1.1**: Session management
- **Test Case 9.1.2**: Token refresh handling
- **Test Case 9.1.3**: Unauthorized access prevention

#### 9.2 Data Access Controls
- **Test Case 9.2.1**: Firestore security rules validation
- **Test Case 9.2.2**: User data isolation
- **Test Case 9.2.3**: Admin privilege verification

## Test Execution Priority

### Phase 1: Critical Path Testing
1. Authentication system (all methods)
2. Per-game pick validation and locking
3. Pick submission and saving

### Phase 2: Core Functionality Testing
4. Leaderboard systems
5. Admin functions
6. UI/UX responsiveness

### Phase 3: Advanced Testing
7. Performance and caching
8. Error handling
9. Security validation

## Bug Documentation Template

### Bug Report Format
- **Bug ID**: [Unique identifier]
- **Severity**: [Critical/High/Medium/Low]
- **Priority**: [High/Medium/Low]
- **Component**: [Authentication/Picks/Leaderboard/Admin/UI/Performance/Security]
- **Summary**: [Brief description]
- **Environment**: [Browser/Device/OS]
- **Steps to Reproduce**: [Detailed steps]
- **Expected Result**: [What should happen]
- **Actual Result**: [What actually happens]
- **Screenshots/Logs**: [Supporting evidence]
- **Recommendations**: [Suggested fixes]

## Test Environment Details
- **Production URL**: https://nerdfootball.web.app
- **Framework**: Vanilla HTML/CSS/JavaScript
- **Backend**: Firebase (Firestore, Auth)
- **Styling**: Tailwind CSS
- **Service Worker**: Cache management and updates
- **Version**: 2.1.0