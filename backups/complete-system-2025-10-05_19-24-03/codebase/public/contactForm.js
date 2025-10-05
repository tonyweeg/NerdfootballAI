class ContactForm {
    constructor() {
        this.init();
    }

    init() {
        this.addContactFooterLink();
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
                    window.location.href = '/contact.html';
                });
            }
        }
    }












}

if (typeof window !== 'undefined') {
    // Only set if not already defined to prevent conflicts
    if (!window.ContactForm) {
        window.ContactForm = ContactForm;
    }

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