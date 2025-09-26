// Load environment variables from .env file
require('dotenv').config();

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const cors = require('cors')({ origin: true });

let transporter = null;

const setupEmailTransport = () => {
    try {
        // Use environment variables for email credentials
        const gmailEmail = process.env.GMAIL_EMAIL;
        const gmailPassword = process.env.GMAIL_PASSWORD;

        console.log('=== EMAIL TRANSPORT DEBUG ===');
        console.log('Environment GMAIL_EMAIL:', process.env.GMAIL_EMAIL ? 'SET' : 'NOT SET');
        console.log('Environment GMAIL_PASSWORD:', process.env.GMAIL_PASSWORD ? 'SET' : 'NOT SET');

        if (gmailEmail && gmailPassword) {
            console.log('Creating nodemailer transporter with email:', gmailEmail);
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: gmailEmail,
                    pass: gmailPassword
                }
            });
            console.log('Contact form email transport configured successfully');
            console.log('Transporter object created:', !!transporter);
            return true;
        }
        console.log('Contact form: Email credentials not found, messages will be logged only');
        return false;
    } catch (error) {
        console.error('Contact form: Error setting up email transport:', error);
        return false;
    }
};

setupEmailTransport();

const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000;
const MAX_SUBMISSIONS_PER_WINDOW = 5;

// Global admin emails (fallback)
const GLOBAL_ADMIN_EMAILS = ['tonyweeg@gmail.com'];

// Get pool admin emails for dynamic routing
async function getPoolAdminEmails(userId, poolId = 'nerduniverse-2025') {
    try {
        const poolMembersRef = admin.firestore().doc(`artifacts/nerdfootball/pools/${poolId}/metadata/members`);
        const poolMembersSnap = await poolMembersRef.get();

        if (!poolMembersSnap.exists) {
            console.log(`Pool ${poolId} not found, using global admins`);
            return GLOBAL_ADMIN_EMAILS;
        }

        const poolMembers = poolMembersSnap.data();
        const adminEmails = [];

        // Find pool admins and get their emails
        for (const [uid, userData] of Object.entries(poolMembers)) {
            if (userData && userData.role === 'admin' && userData.email) {
                adminEmails.push(userData.email);
                console.log(`Found pool admin: ${userData.email}`);
            }
        }

        // If no pool admins found, use global admins
        if (adminEmails.length === 0) {
            console.log(`No pool admins found for ${poolId}, using global admins`);
            return GLOBAL_ADMIN_EMAILS;
        }

        return adminEmails;

    } catch (error) {
        console.error('Error getting pool admin emails:', error);
        return GLOBAL_ADMIN_EMAILS;
    }
}

// Get user's primary pool
async function getUserPool(userId) {
    try {
        if (!userId) return 'nerduniverse-2025'; // Default pool for anonymous users

        // Try to get user's pool memberships
        const userPoolsRef = admin.firestore().doc(`userPools/${userId}`);
        const userPoolsSnap = await userPoolsRef.get();

        if (userPoolsSnap.exists) {
            const userPools = userPoolsSnap.data();
            // Return the first active pool
            for (const [poolId, poolData] of Object.entries(userPools)) {
                if (poolData && poolData.status === 'active') {
                    return poolId;
                }
            }
        }

        // Fallback: Check if user is in the default pool
        const defaultPoolRef = admin.firestore().doc(`artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members`);
        const defaultPoolSnap = await defaultPoolRef.get();

        if (defaultPoolSnap.exists) {
            const poolMembers = defaultPoolSnap.data();
            if (poolMembers[userId]) {
                return 'nerduniverse-2025';
            }
        }

        return 'nerduniverse-2025'; // Default fallback

    } catch (error) {
        console.error('Error getting user pool:', error);
        return 'nerduniverse-2025';
    }
}

exports.submitContactForm = functions.https.onCall(async (data, context) => {
    try {
        // Extract data from the correct location (data.data for Firebase Functions v2)
        const actualData = data.data || data;
        const { name, email, subject, message, userAgent = '', ipAddress = '' } = actualData;

        if (!name || !email || !subject || !message) {
            throw new functions.https.HttpsError('invalid-argument', 'All fields are required');
        }

        if (name.length > 100 || email.length > 254 || subject.length > 200 || message.length > 2000) {
            throw new functions.https.HttpsError('invalid-argument', 'Field length limits exceeded');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid email format');
        }

        const userId = context.auth ? context.auth.uid : null;
        const rateLimitKey = userId || ipAddress || 'anonymous';

        if (rateLimitKey !== 'anonymous') {
            const now = Date.now();
            const windowStart = now - RATE_LIMIT_WINDOW;

            const recentSubmissions = await admin.firestore()
                .collection('contact_submissions')
                .where('rateLimitKey', '==', rateLimitKey)
                .where('timestamp', '>', windowStart)
                .get();

            if (recentSubmissions.size >= MAX_SUBMISSIONS_PER_WINDOW) {
                throw new functions.https.HttpsError('resource-exhausted',
                    'Too many submissions. Please wait 24 hours before submitting again.');
            }
        }

        // Get user's pool and admin emails for dynamic routing
        const userPool = await getUserPool(userId);
        const adminEmails = await getPoolAdminEmails(userId, userPool);

        const submissionId = admin.firestore().collection('contact_submissions').doc().id;
        const timestamp = Date.now();

        const submissionData = {
            id: submissionId,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            subject: subject.trim(),
            message: message.trim(),
            timestamp,
            rateLimitKey,
            userAgent,
            ipAddress,
            userId,
            userPool,
            adminEmails,
            status: 'new',
            adminNotes: '',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await admin.firestore()
            .collection('contact_submissions')
            .doc(submissionId)
            .set(submissionData);

        if (!transporter) {
            setupEmailTransport();
        }

        const adminEmailContent = `New Contact Form Submission from ${userPool} Pool

From: ${name} <${email}>
Subject: ${subject}

Message:
${message}

---
Submission Details:
- Pool: ${userPool}
- Timestamp: ${new Date(timestamp).toLocaleString()}
- User ID: ${userId || 'Not authenticated (anonymous user)'}
- IP Address: ${ipAddress || 'Not available'}
- User Agent: ${userAgent || 'Not available'}
- Submission ID: ${submissionId}

This message was routed to you as a pool administrator.
Reply directly to this email to respond to the user.`;

        const userConfirmationContent = `Dear ${name},

Thank you for contacting NerdFootball! We have received your message and will respond as soon as possible.

Your message:
Subject: ${subject}
Message: ${message}

We typically respond within 24-48 hours. If you have an urgent matter, please reply to this email.

Best regards,
The NerdFootball Team

---
This is an automated confirmation. Please do not reply to this message.
Submission ID: ${submissionId}`;

        try {
            console.log('=== EMAIL SENDING DEBUG ===');
            console.log('Transporter exists:', !!transporter);
            console.log('Admin emails to send to:', adminEmails);

            if (transporter) {
                // Get sender email from environment variables
                const gmailEmail = process.env.GMAIL_EMAIL;

                console.log('Using sender email:', gmailEmail);
                console.log('Attempting to send emails to', adminEmails.length, 'admins');

                // Send to all pool admins
                const adminEmailPromises = adminEmails.map(adminEmail => {
                    const adminMailOptions = {
                        from: `NerdFootball Contact Form <${gmailEmail}>`,
                        to: adminEmail,
                        subject: `Contact Form from ${userPool}: ${subject}`,
                        text: adminEmailContent,
                        replyTo: email
                    };
                    console.log('Sending admin email to:', adminEmail);
                    return transporter.sendMail(adminMailOptions);
                });

                const userMailOptions = {
                    from: `NerdFootball <${gmailEmail}>`,
                    to: email,
                    subject: `Thank you for contacting NerdFootball`,
                    text: userConfirmationContent
                };

                console.log('Sending user confirmation email to:', email);

                const emailResults = await Promise.all([
                    ...adminEmailPromises,
                    transporter.sendMail(userMailOptions)
                ]);

                console.log('Email results:', emailResults.map(result => ({
                    messageId: result.messageId,
                    accepted: result.accepted,
                    rejected: result.rejected
                })));

                console.log(`Contact form emails sent successfully to ${adminEmails.length} admins for submission ${submissionId}`);
            } else {
                console.log('=== CONTACT FORM EMAIL LOG ===');
                console.log('ADMIN EMAILS:');
                adminEmails.forEach(adminEmail => {
                    console.log(`To: ${adminEmail}`);
                    console.log(`From: ${email}`);
                    console.log(`Subject: Contact Form from ${userPool}: ${subject}`);
                    console.log(`Body:\n${adminEmailContent}\n`);
                });
                console.log('\nUSER CONFIRMATION:');
                console.log(`To: ${email}`);
                console.log(`Subject: Thank you for contacting NerdFootball`);
                console.log(`Body:\n${userConfirmationContent}`);
                console.log('==============================');
            }

            return {
                success: true,
                message: 'Your message has been sent successfully. We will respond soon!',
                submissionId,
                emailSent: !!transporter
            };

        } catch (emailError) {
            console.error(`Failed to send contact form emails for submission ${submissionId}:`, emailError);

            return {
                success: true,
                message: 'Your message has been saved. We will respond soon!',
                submissionId,
                emailSent: false,
                emailError: emailError.message
            };
        }

    } catch (error) {
        console.error('Contact form submission error:', error);

        if (error instanceof functions.https.HttpsError) {
            throw error;
        }

        throw new functions.https.HttpsError('internal', 'An error occurred while processing your message');
    }
});

exports.getContactSubmissions = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const ADMIN_UIDS = ['WxSPmEildJdqs6T5hIpBUZrscwt2', 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2'];
    if (!ADMIN_UIDS.includes(context.auth.uid)) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    try {
        // Extract data from the correct location (data.data for Firebase Functions v2)
        const actualData = data.data || data;
        const { limit = 50, startAfter = null, status = null } = actualData;

        let query = admin.firestore()
            .collection('contact_submissions')
            .orderBy('timestamp', 'desc')
            .limit(limit);

        if (status) {
            query = query.where('status', '==', status);
        }

        if (startAfter) {
            const startAfterDoc = await admin.firestore()
                .collection('contact_submissions')
                .doc(startAfter)
                .get();
            query = query.startAfter(startAfterDoc);
        }

        const snapshot = await query.get();
        const submissions = [];

        snapshot.forEach(doc => {
            submissions.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return {
            success: true,
            submissions,
            hasMore: submissions.length === limit
        };

    } catch (error) {
        console.error('Error fetching contact submissions:', error);
        throw new functions.https.HttpsError('internal', 'Failed to fetch contact submissions');
    }
});