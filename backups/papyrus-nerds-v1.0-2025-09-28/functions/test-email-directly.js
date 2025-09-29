const nodemailer = require('nodemailer');

async function testGmailConnection() {
    console.log('🧪 Testing Gmail SMTP Connection...\n');

    const gmailEmail = 'tonyweeg@gmail.com';
    const gmailPassword = 'F0ck1NgT3sl@.!_1z-a'; // From Firebase config

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: gmailEmail,
            pass: gmailPassword
        }
    });

    try {
        // Verify SMTP connection
        await transporter.verify();
        console.log('✅ Gmail SMTP connection successful');

        // Send test email
        const mailOptions = {
            from: `NerdFootball Contact Test <${gmailEmail}>`,
            to: gmailEmail, // Send to self
            subject: 'Contact Form Email Test',
            text: `This is a test email from the contact form system.

Timestamp: ${new Date().toISOString()}
Purpose: Verify email delivery is working

If you receive this, the Gmail SMTP configuration is working correctly.`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Test email sent successfully');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('❌ Gmail SMTP test failed:', error.message);
        return { success: false, error: error.message };
    }
}

// Run test
testGmailConnection()
    .then(result => {
        console.log('\n🏆 Test Result:', result);
        process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
        console.error('🚨 Test crashed:', error);
        process.exit(1);
    });