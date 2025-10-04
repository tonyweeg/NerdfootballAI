# Contact Form Implementation Guide - Firebase Production Ready

## Overview
Comprehensive guide for implementing secure, production-ready Contact Us forms for Firebase-hosted sites with email delivery to `hello@tonyweeg.com`.

## Architecture Analysis
- **Current Infrastructure**: Firebase Functions with nodemailer configured for Gmail transport
- **Email Service**: Gmail SMTP with environment variables (GMAIL_EMAIL, GMAIL_PASSWORD)
- **Security**: Firebase Authentication patterns, CORS protection, input validation

## Quick Implementation Reference

### 1. Firebase Function for Contact Form
```javascript
// functions/contactForm.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const cors = require('cors')({
    origin: ['https://yoursite.web.app', 'https://yoursite.firebaseapp.com', 'http://localhost:5000'],
    methods: ['POST']
});

// Rate limiting store (in production, use Redis or Firestore)
const rateLimitStore = new Map();

// Configure email transporter
const createTransporter = () => {
    const gmailEmail = process.env.GMAIL_EMAIL;
    const gmailPassword = process.env.GMAIL_PASSWORD;
    
    if (!gmailEmail || !gmailPassword) {
        throw new Error('Email credentials not configured');
    }
    
    return nodemailer.createTransporter({
        service: 'gmail',
        auth: {
            user: gmailEmail,
            pass: gmailPassword
        }
    });
};

// Input validation and sanitization
const validateAndSanitizeInput = (data) => {
    const { name, email, message, captchaToken } = data;
    
    // Required field validation
    if (!name || !email || !message || !captchaToken) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid email format');
    }
    
    // Length validation
    if (name.length > 100 || email.length > 255 || message.length > 5000) {
        throw new functions.https.HttpsError('invalid-argument', 'Input too long');
    }
    
    // Basic sanitization (strip HTML)
    const sanitize = (str) => str.replace(/[<>]/g, '');
    
    return {
        name: sanitize(name.trim()),
        email: email.trim().toLowerCase(),
        message: sanitize(message.trim()),
        captchaToken: captchaToken.trim()
    };
};

// CAPTCHA verification (using Google reCAPTCHA)
const verifyCaptcha = async (token) => {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
        console.warn('reCAPTCHA not configured, skipping verification');
        return true; // Allow in development
    }
    
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${secretKey}&response=${token}`
    });
    
    const result = await response.json();
    return result.success && result.score > 0.5; // Adjust threshold as needed
};

// Rate limiting (5 submissions per IP per hour)
const checkRateLimit = (ip) => {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    if (!rateLimitStore.has(ip)) {
        rateLimitStore.set(ip, []);
    }
    
    const submissions = rateLimitStore.get(ip).filter(time => time > hourAgo);
    
    if (submissions.length >= 5) {
        throw new functions.https.HttpsError('resource-exhausted', 'Too many submissions. Try again later.');
    }
    
    submissions.push(now);
    rateLimitStore.set(ip, submissions);
};

// Main contact form function
exports.submitContactForm = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
        try {
            // Only allow POST requests
            if (req.method !== 'POST') {
                res.status(405).json({ error: 'Method not allowed' });
                return;
            }
            
            // Get client IP for rate limiting
            const clientIP = req.ip || req.connection.remoteAddress;
            checkRateLimit(clientIP);
            
            // Validate and sanitize input
            const sanitizedData = validateAndSanitizeInput(req.body);
            
            // Verify CAPTCHA
            const isCaptchaValid = await verifyCaptcha(sanitizedData.captchaToken);
            if (!isCaptchaValid) {
                throw new functions.https.HttpsError('invalid-argument', 'CAPTCHA verification failed');
            }
            
            // Create email content
            const emailContent = `
Contact Form Submission

Name: ${sanitizedData.name}
Email: ${sanitizedData.email}
Timestamp: ${new Date().toLocaleString()}
IP Address: ${clientIP}

Message:
${sanitizedData.message}

---
Sent from Contact Form
Reply to: ${sanitizedData.email}
            `.trim();
            
            // Send email
            const transporter = createTransporter();
            const mailOptions = {
                from: `Contact Form <${process.env.GMAIL_EMAIL}>`,
                to: 'hello@tonyweeg.com',
                subject: `Contact Form: ${sanitizedData.name}`,
                text: emailContent,
                replyTo: sanitizedData.email
            };
            
            await transporter.sendMail(mailOptions);
            
            // Log successful submission (don't log sensitive data)
            console.log(`Contact form submitted by ${sanitizedData.name} (${sanitizedData.email})`);
            
            res.status(200).json({ 
                success: true, 
                message: 'Message sent successfully' 
            });
            
        } catch (error) {
            console.error('Contact form error:', error);
            
            if (error.code && error.code.startsWith('functions/')) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    });
});
```

### 2. Frontend HTML Form
```html
<!-- Contact Form HTML -->
<div id="contact-form-container" class="max-w-lg mx-auto p-6 bg-white rounded-lg shadow-md">
    <h2 class="text-2xl font-bold mb-6 text-gray-900">Contact Us</h2>
    
    <form id="contact-form" class="space-y-4">
        <div>
            <label for="name" class="block text-sm font-medium text-gray-700">Name *</label>
            <input type="text" id="name" name="name" required maxlength="100"
                   class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
        </div>
        
        <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Email *</label>
            <input type="email" id="email" name="email" required maxlength="255"
                   class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
        </div>
        
        <div>
            <label for="message" class="block text-sm font-medium text-gray-700">Message *</label>
            <textarea id="message" name="message" rows="5" required maxlength="5000"
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"></textarea>
        </div>
        
        <!-- reCAPTCHA container -->
        <div id="recaptcha-container" class="flex justify-center"></div>
        
        <button type="submit" id="submit-btn" 
                class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50">
            Send Message
        </button>
    </form>
    
    <!-- Status messages -->
    <div id="form-status" class="mt-4 hidden"></div>
</div>

<!-- reCAPTCHA Script -->
<script src="https://www.google.com/recaptcha/api.js?render=YOUR_SITE_KEY"></script>
```

### 3. Frontend JavaScript
```javascript
// Contact Form JavaScript
class ContactFormManager {
    constructor() {
        this.form = document.getElementById('contact-form');
        this.submitBtn = document.getElementById('submit-btn');
        this.statusDiv = document.getElementById('form-status');
        this.siteKey = 'YOUR_RECAPTCHA_SITE_KEY'; // Replace with actual key
        
        this.initializeForm();
    }
    
    initializeForm() {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        
        // Initialize reCAPTCHA
        if (typeof grecaptcha !== 'undefined') {
            grecaptcha.ready(() => {
                grecaptcha.render('recaptcha-container', {
                    sitekey: this.siteKey,
                    theme: 'light'
                });
            });
        }
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        this.setLoading(true);
        this.hideStatus();
        
        try {
            // Get form data
            const formData = new FormData(this.form);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                message: formData.get('message')
            };
            
            // Get reCAPTCHA token
            if (typeof grecaptcha !== 'undefined') {
                data.captchaToken = await grecaptcha.execute(this.siteKey, { action: 'contact_form' });
            } else {
                console.warn('reCAPTCHA not loaded');
                data.captchaToken = 'test-token';
            }
            
            // Submit form
            const response = await fetch('/submitContactForm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                this.showSuccess('Thank you! Your message has been sent successfully.');
                this.form.reset();
                if (typeof grecaptcha !== 'undefined') {
                    grecaptcha.reset();
                }
            } else {
                throw new Error(result.error || 'Failed to send message');
            }
            
        } catch (error) {
            console.error('Form submission error:', error);
            this.showError(error.message || 'Failed to send message. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }
    
    setLoading(isLoading) {
        this.submitBtn.disabled = isLoading;
        this.submitBtn.textContent = isLoading ? 'Sending...' : 'Send Message';
    }
    
    showSuccess(message) {
        this.statusDiv.className = 'mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded';
        this.statusDiv.textContent = message;
        this.statusDiv.classList.remove('hidden');
    }
    
    showError(message) {
        this.statusDiv.className = 'mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded';
        this.statusDiv.textContent = message;
        this.statusDiv.classList.remove('hidden');
    }
    
    hideStatus() {
        this.statusDiv.classList.add('hidden');
    }
}

// Initialize contact form when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ContactFormManager();
});
```

## Security Configuration

### Environment Variables
Add to Firebase Functions environment:
```bash
firebase functions:config:set gmail.email="your-gmail@gmail.com"
firebase functions:config:set gmail.password="your-app-password"
firebase functions:config:set recaptcha.secret="your-recaptcha-secret"
```

### Firebase Security Rules
```javascript
// firestore.rules - if storing contact submissions
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /contact_submissions/{document} {
      allow read, write: if false; // Only Cloud Functions can access
    }
  }
}
```

### CORS Configuration
```javascript
// firebase.json hosting headers
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self' https://www.google.com https://www.gstatic.com; script-src 'self' 'unsafe-inline' https://www.google.com; style-src 'self' 'unsafe-inline'"
          }
        ]
      }
    ]
  }
}
```

## Spam Prevention Layers

### 1. reCAPTCHA v3 Integration
- **Score-based**: Automatically detects bot behavior
- **Invisible**: No user interaction required
- **Threshold**: Reject scores below 0.5

### 2. Rate Limiting
- **5 submissions per IP per hour**
- **Firestore-based tracking** for production
- **Exponential backoff** for repeat offenders

### 3. Input Validation
- **Server-side validation** (never trust client)
- **Length limits** on all fields
- **Email format validation**
- **HTML sanitization**

### 4. Content Filtering
```javascript
// Optional: Add content filtering
const containsSpam = (message) => {
    const spamKeywords = ['bitcoin', 'crypto', 'investment', 'loan', 'casino'];
    const lowerMessage = message.toLowerCase();
    return spamKeywords.some(keyword => lowerMessage.includes(keyword));
};
```

## Production Deployment Checklist

### Pre-Deployment
- [ ] Set up Gmail App Password (not regular password)
- [ ] Configure reCAPTCHA keys (site key and secret key)
- [ ] Test form in Firebase Functions emulator
- [ ] Verify CORS settings for your domain
- [ ] Set up monitoring and alerts

### Environment Setup
```bash
# Set up environment variables
firebase functions:config:set gmail.email="your-email@gmail.com"
firebase functions:config:set gmail.password="your-16-char-app-password"
firebase functions:config:set recaptcha.secret="your-recaptcha-secret-key"

# Deploy functions
firebase deploy --only functions:submitContactForm
```

### Testing
```bash
# Test locally
firebase emulators:start --only functions
curl -X POST http://localhost:5001/your-project/us-central1/submitContactForm \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"Test message","captchaToken":"test"}'
```

## Monitoring and Maintenance

### Cloud Function Metrics
Monitor in Firebase Console:
- **Invocations**: Track usage patterns
- **Errors**: Monitor for spam attempts
- **Duration**: Ensure fast response times
- **Memory usage**: Optimize if needed

### Email Delivery Monitoring
```javascript
// Enhanced logging
const logSubmission = async (data, success, error) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        email: data.email,
        success: success,
        error: error?.message,
        ip: req.ip
    };
    
    // Store in Firestore for analysis
    await admin.firestore().collection('contact_logs').add(logEntry);
};
```

### Budget Alerts
Set up billing alerts in Google Cloud Console:
- **Daily budget**: $5-10 for small sites
- **Alert threshold**: 80% of budget
- **Email notifications**: To admin email

## Advanced Features (Optional)

### Auto-Reply Functionality
```javascript
// Send confirmation email to user
const sendAutoReply = async (userEmail, userName) => {
    const autoReplyContent = `
Dear ${userName},

Thank you for contacting us! We have received your message and will get back to you within 24-48 hours.

Best regards,
The Team

---
This is an automated response. Please do not reply to this email.
    `;
    
    const mailOptions = {
        from: `No Reply <${process.env.GMAIL_EMAIL}>`,
        to: userEmail,
        subject: 'Thank you for contacting us',
        text: autoReplyContent
    };
    
    await transporter.sendMail(mailOptions);
};
```

### Firestore Storage
```javascript
// Store submissions in Firestore (optional)
const storeSubmission = async (data, ip) => {
    await admin.firestore().collection('contact_submissions').add({
        ...data,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ip: ip,
        status: 'pending'
    });
};
```

### Webhook Integration
```javascript
// Integration with Slack/Discord notifications
const notifyTeam = async (data) => {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;
    
    const payload = {
        text: `New contact form submission from ${data.name} (${data.email})`
    };
    
    await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
};
```

## Multiple Site Implementation

### NerdFootball Integration
```javascript
// Add to existing functions/index.js
const { submitContactForm } = require('./contactForm');
exports.submitContactForm = submitContactForm;
```

### AuraFlow Platform Setup
```bash
# Clone configuration for second project
firebase use auraflow-project-id
firebase functions:config:set gmail.email="your-email@gmail.com"
firebase functions:config:set gmail.password="your-app-password"
firebase deploy --only functions:submitContactForm
```

### Shared Configuration
```javascript
// Detect project and customize behavior
const getProjectConfig = () => {
    const projectId = process.env.GCLOUD_PROJECT;
    
    if (projectId.includes('nerdfootball')) {
        return {
            replyTo: 'hello@tonyweeg.com',
            subject: 'NerdFootball Contact Form'
        };
    } else if (projectId.includes('auraflow')) {
        return {
            replyTo: 'hello@tonyweeg.com',
            subject: 'AuraFlow Contact Form'
        };
    }
    
    return {
        replyTo: 'hello@tonyweeg.com',
        subject: 'Contact Form Submission'
    };
};
```

## Error Handling and Recovery

### Graceful Degradation
```javascript
// Fallback when email service fails
const handleEmailFailure = async (data, error) => {
    console.error('Email delivery failed:', error);
    
    // Store in Firestore as backup
    await admin.firestore().collection('failed_emails').add({
        ...data,
        error: error.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Still return success to user (don't show technical errors)
    return { success: true, message: 'Message received. We will respond soon.' };
};
```

### Health Check Endpoint
```javascript
// Health check for monitoring
exports.contactFormHealth = functions.https.onRequest((req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
```

## Cost Optimization

### Function Configuration
```javascript
// Optimize memory and timeout
exports.submitContactForm = functions
    .region('us-central1')
    .runWith({
        memory: '256MB',
        timeoutSeconds: 30,
        maxInstances: 10
    })
    .https.onRequest(handler);
```

### Email Service Alternatives
If Gmail limits become an issue:
- **SendGrid**: 100 emails/day free
- **Mailgun**: 5,000 emails/month free
- **AWS SES**: $0.10 per 1,000 emails

## Success Metrics

### Key Performance Indicators
- **Form completion rate**: >90%
- **Spam detection accuracy**: >95%
- **Response time**: <2 seconds
- **Email delivery rate**: >99%
- **Error rate**: <1%

### Analytics Integration
```javascript
// Track form submissions in Google Analytics
const trackSubmission = (data) => {
    gtag('event', 'form_submit', {
        event_category: 'contact',
        event_label: 'contact_form',
        value: 1
    });
};
```

This implementation provides enterprise-level security, reliability, and scalability for contact forms on Firebase-hosted sites.