const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

let transporter = null;

const setupEmailTransport = () => {
    try {
        const gmailEmail = process.env.GMAIL_EMAIL;
        const gmailPassword = process.env.GMAIL_PASSWORD;

        if (gmailEmail && gmailPassword) {
            transporter = nodemailer.createTransporter({
                service: 'gmail',
                auth: {
                    user: gmailEmail,
                    pass: gmailPassword
                }
            });
            console.log('Contact form email transport configured successfully');
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

        const adminEmailContent = `New Contact Form Submission

From: ${name} <${email}>
Subject: ${subject}

Message:
${message}

---
Submission Details:
- Timestamp: ${new Date(timestamp).toLocaleString()}
- User ID: ${userId || 'Not authenticated'}
- IP Address: ${ipAddress || 'Not available'}
- User Agent: ${userAgent || 'Not available'}
- Submission ID: ${submissionId}

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
            if (transporter) {
                const gmailEmail = process.env.GMAIL_EMAIL;

                const adminMailOptions = {
                    from: `NerdFootball Contact Form <${gmailEmail}>`,
                    to: 'tonyweeg@gmail.com',
                    subject: `Contact Form: ${subject}`,
                    text: adminEmailContent,
                    replyTo: email
                };

                const userMailOptions = {
                    from: `NerdFootball <${gmailEmail}>`,
                    to: email,
                    subject: `Thank you for contacting NerdFootball`,
                    text: userConfirmationContent
                };

                await Promise.all([
                    transporter.sendMail(adminMailOptions),
                    transporter.sendMail(userMailOptions)
                ]);

                console.log(`Contact form emails sent successfully for submission ${submissionId}`);
            } else {
                console.log('=== CONTACT FORM EMAIL LOG ===');
                console.log('ADMIN EMAIL:');
                console.log(`To: tonyweeg@gmail.com`);
                console.log(`From: ${email}`);
                console.log(`Subject: Contact Form: ${subject}`);
                console.log(`Body:\n${adminEmailContent}`);
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