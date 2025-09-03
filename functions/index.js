const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Initialize Firebase Admin
admin.initializeApp();

// Configure nodemailer transporter (will be null if not configured)
let transporter = null;

// Try to set up email transport if credentials are available
const setupEmailTransport = () => {
    try {
        // Check for Gmail configuration in environment variables (Functions v2)
        const gmailEmail = process.env.GMAIL_EMAIL;
        const gmailPassword = process.env.GMAIL_PASSWORD;
        
        if (gmailEmail && gmailPassword) {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: gmailEmail,
                    pass: gmailPassword
                }
            });
            console.log('Email transport configured successfully');
            return true;
        }
        console.log('Email credentials not found, emails will be logged only');
        return false;
    } catch (error) {
        console.error('Error setting up email transport:', error);
        return false;
    }
};

// Initialize email transport
setupEmailTransport();

// Cloud Function to send system messages
exports.sendSystemMessage = functions.https.onCall(async (data, context) => {
    // For Firebase Functions v2, auth context is in data.auth instead of context.auth
    const authContext = context.auth || data.auth;
    
    // Check if user is authenticated
    if (!authContext) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    // Check if user is admin
    const ADMIN_UIDS = ['WxSPmEildJdqs6T5hIpBUZrscwt2', 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2'];
    const userUid = authContext.uid || authContext.token?.uid;
    
    if (!ADMIN_UIDS.includes(userUid)) {
        throw new functions.https.HttpsError('permission-denied', 'User must be an admin');
    }
    
    // Extract data from the correct location (data.data for Firebase Functions v2)
    const actualData = data.data || data;
    const { recipients, subject, body } = actualData;
    
    if (!recipients || !subject || !body) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }
    
    const results = {
        successful: [],
        failed: []
    };
    
    // Setup transport if not already done
    if (!transporter) {
        setupEmailTransport();
    }
    
    // Send emails to each recipient
    for (const recipient of recipients) {
        const displayName = recipient.displayName || 'Nerd';
        
        const emailContent = `Dear Nerd ${displayName},

${body}

Ållfåther Nerd

---
This message was sent from NerdFootball AI System
Reply to: tonyweeg@gmail.com`;
        
        try {
            if (transporter) {
                // Actually send the email
                const gmailEmail = process.env.GMAIL_EMAIL;
                const mailOptions = {
                    from: `NerdFootball AI <${gmailEmail}>`,
                    to: recipient.email,
                    subject: subject,
                    text: emailContent,
                    replyTo: 'tonyweeg@gmail.com'
                };
                
                await transporter.sendMail(mailOptions);
                results.successful.push(recipient.email);
                console.log(`Email sent successfully to ${recipient.email}`);
            } else {
                // Log email content when transporter is not available
                console.log('=== EMAIL LOG (No transport configured) ===');
                console.log(`To: ${recipient.email}`);
                console.log(`Subject: ${subject}`);
                console.log(`Body:\n${emailContent}`);
                console.log('==========================================');
                results.successful.push(recipient.email);
            }
        } catch (error) {
            console.error(`Failed to send email to ${recipient.email}:`, error);
            results.failed.push({
                email: recipient.email,
                error: error.message
            });
        }
    }
    
    return {
        success: results.successful.length > 0,
        successCount: results.successful.length,
        failCount: results.failed.length,
        successful: results.successful,
        failed: results.failed,
        emailServiceConfigured: !!transporter
    };
});

// Cloud Function to send pick confirmation emails
exports.sendPickConfirmation = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const { userEmail, userName, picks, weekNumber } = data;
    
    if (!userEmail || !picks || !weekNumber) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }
    
    // Setup transport if not already done
    if (!transporter) {
        setupEmailTransport();
    }
    
    // Format picks for email
    let picksList = 'Your picks for Week ' + weekNumber + ':\n\n';
    
    Object.entries(picks).forEach(([gameId, pick]) => {
        if (pick && pick.team) {
            picksList += `• ${pick.team} (Confidence: ${pick.confidence || 'N/A'})\n`;
        }
    });
    
    picksList += `\nSubmission time: ${new Date().toLocaleString()}`;
    
    const emailContent = `Dear ${userName || 'Nerd'},

Your picks have been successfully saved!

${picksList}

Good luck this week!

Ållfåther Nerd

---
This message was sent from NerdFootball AI System
Reply to: tonyweeg@gmail.com`;
    
    try {
        if (transporter) {
            // Actually send the email
            const gmailEmail = process.env.GMAIL_EMAIL;
            const mailOptions = {
                from: `NerdFootball AI <${gmailEmail}>`,
                to: userEmail,
                subject: `Week ${weekNumber} Picks Confirmed - NerdFootball AI`,
                text: emailContent,
                replyTo: 'tonyweeg@gmail.com'
            };
            
            await transporter.sendMail(mailOptions);
            console.log(`Pick confirmation email sent to ${userEmail}`);
            return { success: true, message: 'Confirmation email sent', emailServiceConfigured: true };
        } else {
            // Log email when transporter is not available
            console.log('=== PICK CONFIRMATION EMAIL LOG ===');
            console.log(`To: ${userEmail}`);
            console.log(`Subject: Week ${weekNumber} Picks Confirmed`);
            console.log(`Body:\n${emailContent}`);
            console.log('===================================');
            return { success: true, message: 'Email logged (service not configured)', emailServiceConfigured: false };
        }
    } catch (error) {
        console.error(`Failed to send pick confirmation to ${userEmail}:`, error);
        return { success: false, error: error.message, emailServiceConfigured: !!transporter };
    }
});