class ContactForm {
    constructor() {
        this.isSubmitting = false;
        this.formElement = null;
        this.modalElement = null;
        this.init();
    }

    init() {
        this.createContactModal();
        this.addContactFooterLink();
        this.setupEventListeners();
    }

    createContactModal() {
        const modalHTML = `
        <div id="contact-modal" class="fixed inset-0 z-50 hidden overflow-y-auto">
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="fixed inset-0 bg-black opacity-50" id="contact-modal-backdrop"></div>
                <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto z-10">
                    <div class="p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="text-xl font-bold text-gray-900">Contact Us</h2>
                            <button id="close-contact-modal" class="text-gray-400 hover:text-gray-600 focus:outline-none">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>

                        <form id="contact-form" class="space-y-4">
                            <div>
                                <label for="contact-name" class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                <input type="text" id="contact-name" name="name" required maxlength="100"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Your full name">
                            </div>

                            <div>
                                <label for="contact-email" class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input type="email" id="contact-email" name="email" required maxlength="254"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="your@email.com">
                            </div>

                            <div>
                                <label for="contact-subject" class="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                                <input type="text" id="contact-subject" name="subject" required maxlength="200"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="What is this regarding?">
                            </div>

                            <div>
                                <label for="contact-message" class="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                                <textarea id="contact-message" name="message" required maxlength="2000" rows="4"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    placeholder="Tell us how we can help..."></textarea>
                                <div class="text-right mt-1">
                                    <span id="message-counter" class="text-xs text-gray-500">0/2000</span>
                                </div>
                            </div>

                            <div id="contact-form-error" class="hidden text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3"></div>

                            <div class="flex space-x-3 pt-4">
                                <button type="button" id="contact-cancel-btn"
                                    class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                    Cancel
                                </button>
                                <button type="submit" id="contact-submit-btn"
                                    class="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <span id="contact-submit-text">Send Message</span>
                                    <div id="contact-submit-spinner" class="hidden inline-flex items-center">
                                        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Sending...
                                    </div>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modalElement = document.getElementById('contact-modal');
        this.formElement = document.getElementById('contact-form');
    }

    addContactFooterLink() {
        // Create footer contact link
        const footerLinkHTML = `
            <div id="contact-footer" class="fixed bottom-4 left-4 z-40">
                <button id="contact-footer-link"
                    class="text-xs text-slate-500 hover:text-slate-700 underline hover:no-underline transition-colors duration-200 bg-white/80 backdrop-blur-sm px-2 py-1 rounded shadow-sm">
                    Contact Us
                </button>
            </div>
        `;

        // Only add if doesn't exist
        if (!document.getElementById('contact-footer')) {
            document.body.insertAdjacentHTML('beforeend', footerLinkHTML);

            const contactLink = document.getElementById('contact-footer-link');
            if (contactLink) {
                contactLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.openModal();
                });
            }
        }
    }

    setupEventListeners() {
        const messageTextarea = document.getElementById('contact-message');
        const messageCounter = document.getElementById('message-counter');
        const closeModalBtn = document.getElementById('close-contact-modal');
        const cancelBtn = document.getElementById('contact-cancel-btn');
        const modalBackdrop = document.getElementById('contact-modal-backdrop');

        if (messageTextarea && messageCounter) {
            messageTextarea.addEventListener('input', () => {
                const length = messageTextarea.value.length;
                messageCounter.textContent = `${length}/2000`;
                messageCounter.className = length > 1900 ? 'text-xs text-red-500' : 'text-xs text-gray-500';
            });
        }

        [closeModalBtn, cancelBtn, modalBackdrop].forEach(element => {
            if (element) {
                element.addEventListener('click', () => this.closeModal());
            }
        });

        if (this.formElement) {
            this.formElement.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalOpen()) {
                this.closeModal();
            }
        });
    }

    openModal() {
        if (this.modalElement) {
            this.modalElement.classList.remove('hidden');
            this.resetForm();
            const nameInput = document.getElementById('contact-name');
            if (nameInput) {
                setTimeout(() => nameInput.focus(), 100);
            }

            const menuPanel = document.getElementById('menu-panel');
            if (menuPanel) {
                menuPanel.classList.add('hidden');
            }
        }
    }

    closeModal() {
        if (this.modalElement && !this.isSubmitting) {
            this.modalElement.classList.add('hidden');
        }
    }

    isModalOpen() {
        return this.modalElement && !this.modalElement.classList.contains('hidden');
    }

    resetForm() {
        if (this.formElement) {
            this.formElement.reset();
            this.hideError();
            this.setSubmittingState(false);
            const messageCounter = document.getElementById('message-counter');
            if (messageCounter) {
                messageCounter.textContent = '0/2000';
                messageCounter.className = 'text-xs text-gray-500';
            }
        }
    }

    showError(message) {
        const errorElement = document.getElementById('contact-form-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        }
    }

    hideError() {
        const errorElement = document.getElementById('contact-form-error');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    }

    setSubmittingState(isSubmitting) {
        this.isSubmitting = isSubmitting;
        const submitBtn = document.getElementById('contact-submit-btn');
        const submitText = document.getElementById('contact-submit-text');
        const submitSpinner = document.getElementById('contact-submit-spinner');

        if (submitBtn) {
            submitBtn.disabled = isSubmitting;
        }

        if (submitText) {
            submitText.classList.toggle('hidden', isSubmitting);
        }

        if (submitSpinner) {
            submitSpinner.classList.toggle('hidden', !isSubmitting);
        }
    }

    validateForm(formData) {
        const name = formData.get('name')?.trim();
        const email = formData.get('email')?.trim();
        const subject = formData.get('subject')?.trim();
        const message = formData.get('message')?.trim();

        if (!name || !email || !subject || !message) {
            throw new Error('All fields are required');
        }

        if (name.length > 100) {
            throw new Error('Name must be 100 characters or less');
        }

        if (email.length > 254) {
            throw new Error('Email must be 254 characters or less');
        }

        if (subject.length > 200) {
            throw new Error('Subject must be 200 characters or less');
        }

        if (message.length > 2000) {
            throw new Error('Message must be 2000 characters or less');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Please enter a valid email address');
        }

        return { name, email, subject, message };
    }

    async handleSubmit(event) {
        event.preventDefault();

        if (this.isSubmitting) {
            return;
        }

        const startTime = performance.now();

        try {
            this.setSubmittingState(true);
            this.hideError();

            const formData = new FormData(this.formElement);
            const validatedData = this.validateForm(formData);

            if (!window.functions || !window.httpsCallable) {
                throw new Error('Firebase Functions not available. Please refresh the page and try again.');
            }

            const submitContactForm = window.httpsCallable(window.functions, 'submitContactForm');

            const submissionData = {
                ...validatedData,
                userAgent: navigator.userAgent,
                timestamp: Date.now()
            };

            const result = await submitContactForm(submissionData);

            const endTime = performance.now();
            const responseTime = endTime - startTime;

            if (result.data.success) {
                this.showSuccessMessage(result.data.message, responseTime);
                this.resetForm();
                setTimeout(() => this.closeModal(), 2000);
            } else {
                throw new Error(result.data.message || 'Failed to send message');
            }

        } catch (error) {
            console.error('Contact form submission error:', error);

            let errorMessage = 'An error occurred while sending your message. Please try again.';

            if (error.message.includes('unauthenticated')) {
                errorMessage = 'Please sign in to send a message.';
            } else if (error.message.includes('invalid-argument')) {
                errorMessage = error.message;
            } else if (error.message.includes('resource-exhausted')) {
                errorMessage = 'You have reached the daily limit for contact form submissions. Please wait 24 hours.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            this.showError(errorMessage);
        } finally {
            this.setSubmittingState(false);
        }
    }

    showSuccessMessage(message, responseTime = null) {
        const errorElement = document.getElementById('contact-form-error');
        if (errorElement) {
            errorElement.textContent = `✓ ${message}`;
            errorElement.className = 'text-sm text-green-600 bg-green-50 border border-green-200 rounded-md p-3';

            if (responseTime && responseTime < 500) {
                console.log(`Contact form submitted in ${Math.round(responseTime)}ms - Diamond Level performance maintained`);
            }
        }
    }

    getStatus() {
        return {
            isModalOpen: this.isModalOpen(),
            isSubmitting: this.isSubmitting,
            hasFormElement: !!this.formElement,
            hasModalElement: !!this.modalElement
        };
    }
}

if (typeof window !== 'undefined') {
    window.ContactForm = ContactForm;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                window.contactForm = new ContactForm();
            }, 1000);
        });
    } else {
        window.contactForm = new ContactForm();
    }
}