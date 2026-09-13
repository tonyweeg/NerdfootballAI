/**
 * NerdFootball theme switching — the UI/UX standard.
 *
 * Pairs with css/nerd-theme.css. Include both, then add a button carrying
 * class="theme-toggle" anywhere in the page; this wires it automatically.
 *
 * Order matters: applyStoredTheme() must run in <head>, BEFORE first paint, or
 * a light-mode visitor gets a dark flash. The rest runs on DOMContentLoaded.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'nerdfootball-theme';

    function storedTheme() {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            // Private mode / blocked storage: fall back to the OS preference.
            return null;
        }
    }

    function systemTheme() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
            ? 'light'
            : 'dark';
    }

    /** Current theme, whether it came from storage or the OS. */
    function activeTheme() {
        return storedTheme() || systemTheme();
    }

    /** Applies the stored choice. Safe to call before the DOM exists. */
    function applyStoredTheme() {
        var theme = storedTheme();
        if (theme === 'light' || theme === 'dark') {
            document.documentElement.setAttribute('data-theme', theme);
        }
        // With nothing stored we leave the attribute off on purpose, so the
        // prefers-color-scheme rules in the stylesheet stay in charge.
    }

    function setTheme(theme) {
        var root = document.documentElement;

        // Transitions are enabled only for the flip itself, so the initial
        // paint never animates.
        root.classList.add('theme-animating');
        root.setAttribute('data-theme', theme);

        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch (e) {
            // Choice will not survive a reload; the flip still works.
        }

        window.setTimeout(function () {
            root.classList.remove('theme-animating');
        }, 320);

        window.dispatchEvent(new CustomEvent('nerdtheme:change', { detail: { theme: theme } }));
    }

    function toggleTheme() {
        setTheme(activeTheme() === 'light' ? 'dark' : 'light');
    }

    // Idempotent: components render toggles after this script runs and call
    // wire() themselves, and DOMContentLoaded wiring may run afterwards. The
    // marker lives on the element so a second pass never double-binds — two
    // handlers on one button would flip the theme twice, i.e. not at all.
    function wireButtons(root) {
        var buttons = (root || document).querySelectorAll('.theme-toggle');
        for (var i = 0; i < buttons.length; i++) {
            if (buttons[i].hasAttribute('data-theme-wired')) continue;
            buttons[i].setAttribute('data-theme-wired', '');
            buttons[i].addEventListener('click', toggleTheme);
            buttons[i].setAttribute('aria-label', 'Switch between light and dark theme');
            buttons[i].setAttribute('title', 'Switch theme');
        }
    }

    applyStoredTheme();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { wireButtons(); });
    } else {
        wireButtons();
    }

    // Follow the OS while the visitor has never made an explicit choice.
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function () {
            if (!storedTheme()) {
                document.documentElement.removeAttribute('data-theme');
            }
        });
    }

    window.NerdTheme = {
        get: activeTheme,
        set: setTheme,
        toggle: toggleTheme,
        wire: wireButtons,
        clear: function () {
            try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
            document.documentElement.removeAttribute('data-theme');
        }
    };
})();
