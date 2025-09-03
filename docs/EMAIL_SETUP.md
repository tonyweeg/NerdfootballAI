# Email Setup Instructions for NerdFootball AI

## Gmail App Password Setup

To enable email sending through Firebase Cloud Functions, you need to set up Gmail App Passwords:

### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to Security
3. Enable 2-Step Verification if not already enabled

### Step 2: Create an App Password
1. In Google Account Security settings, find "App passwords"
2. Click on "App passwords"
3. Select "Mail" as the app
4. Select "Other" as the device and name it "NerdFootball Firebase"
5. Click "Generate"
6. Copy the 16-character password (spaces don't matter)

### Step 3: Set Firebase Functions Config
Run these commands in your terminal from the project root:

```bash
# Set the Gmail email address
firebase functions:config:set gmail.email="your-gmail@gmail.com"

# Set the app password (the 16-character password from Step 2)
firebase functions:config:set gmail.password="xxxx xxxx xxxx xxxx"

# Verify the config is set
firebase functions:config:get
```

### Step 4: Deploy the Functions
```bash
firebase deploy --only functions
```

## Alternative: Using Environment Variables (for local testing)

Create a `.env` file in the `functions/` directory:

```
GMAIL_EMAIL=your-gmail@gmail.com
GMAIL_PASSWORD=your-app-password
```

**Note:** Never commit the `.env` file to version control!

## Testing the Email Service

1. Log in as an admin user
2. Go to the Admin panel
3. Navigate to "System Messenger"
4. Send a test message to yourself

## Troubleshooting

### "Email service not configured" Error
- Ensure you've set the Firebase Functions config as shown in Step 3
- Redeploy the functions after setting the config

### Emails Not Sending
- Check that 2-Factor Authentication is enabled on your Google Account
- Verify the App Password is correct
- Check Firebase Functions logs: `firebase functions:log`

### Gmail Security Issues
- Make sure you're using an App Password, not your regular Gmail password
- Ensure "Less secure app access" is NOT needed (App Passwords bypass this)

## Production Recommendations

For production use, consider:
1. **SendGrid**: More reliable for transactional emails
2. **AWS SES**: Cost-effective for high volume
3. **Mailgun**: Good deliverability and analytics
4. **Postmark**: Excellent for transactional emails

These services provide better deliverability, analytics, and won't have Gmail's sending limits.