# Gmail SMTP Setup for Contact Form

## Step 1: Generate Gmail App Password
1. Go to https://myaccount.google.com/
2. Security → 2-Step Verification (must be enabled first)
3. App Passwords → Generate → Select "Mail"
4. Copy the 16-character app password

## Step 2: Set Firebase Environment Variables

Run these commands in your terminal (replace with your actual email and app password):

```bash
firebase functions:config:set gmail.email="your-email@gmail.com"
firebase functions:config:set gmail.password="your-16-char-app-password"
```

## Step 3: Deploy Functions
```bash
firebase deploy --only functions
```

## Step 4: Verify Setup
- Check Firebase Functions logs for successful email delivery
- Test contact form submission
- Check that emails arrive at the specified admin email

## ✅ Dynamic Admin Email Routing (IMPLEMENTED)

### How It Works:
1. **Pool Detection**: Automatically detects which pool the user belongs to
2. **Admin Lookup**: Finds all admins for that pool from Firestore
3. **Dynamic Routing**: Sends email notifications to all pool admins
4. **Fallback**: Uses global admin emails if no pool admins found

### Email Routing Logic:
- **Authenticated Users**: Routes to their pool's admin emails
- **Anonymous Users**: Routes to default pool (nerduniverse-2025) admins
- **Multiple Pool Admins**: Sends to ALL admins in the user's pool
- **No Pool Admins**: Falls back to global admins (tonyweeg@gmail.com)

### Admin Email Sources:
- **Pool Admins**: `artifacts/nerdfootball/pools/{poolId}/metadata/members` (role: 'admin')
- **Global Admins**: Hardcoded fallback list in contactHandler.js
- **Subject Line**: Includes pool name for easy identification

### Benefits:
- ✅ Scales automatically as new pools are added
- ✅ Pool-specific admin routing
- ✅ Multiple admin support per pool
- ✅ Automatic failover to global admins
- ✅ Pool name in subject line for context