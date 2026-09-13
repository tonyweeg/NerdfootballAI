/**
 * NerdFootball shared header (NERD-20) — brand, page title, theme toggle,
 * hamburger with the site nav, signed-in user and logout. Defined once here.
 *
 * Usage (place the script directly after the slot so it renders before paint):
 *   <link rel="stylesheet" href="./css/nerd-header.css">
 *   <div class="nerd-header-slot" data-nerd-header data-title="Page" data-back="true"></div>
 *   <script src="./js/components/nerd-header.js"></script>
 *
 * The component knows nothing about Firebase. The page reports auth state:
 *   NerdHeader.current.setUser(user);            // { email } or null
 *   NerdHeader.current.setLogoutHandler(fn);     // logout stays hidden until set
 */
(function () {
    'use strict';

    // Same links, labels, icons and order as the nerd-universe menu panel
    // (tests/nerd-header.test.js keeps the two in lockstep).
    var NAV_ITEMS = Object.freeze([
        { href: './nerd-universe-grid.html', icon: 'grid_view', label: 'Picks Grid', featured: true },
        { href: './nerds-battlestar-galactica.html', icon: 'trending_up', label: 'Upside View' },
        { href: './tricked-out-ricky.html', icon: 'insights', label: 'Tricked Out Ricky' },
        { href: './index.html', icon: 'ads_click', label: 'Make Picks' },
        { href: './nerdSurvivor.html', icon: 'sports_football', label: 'Survivor Pool' },
        { href: './the-survival-chamber-36-degrees.html', icon: 'shield', label: 'The 36 Chambers' },
        { href: './leaderboard.html', icon: 'emoji_events', label: 'Season Leaderboard' },
        { href: './weekly-leaderboard.html', icon: 'calendar_view_week', label: 'Weekly Leaderboard' }
    ].map(Object.freeze));

    var LOGO_SRC = 'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nerdfootball-nerd-2025.png?alt=media&token=de5cef91-c70e-49bc-ba71-6f993439b11e';
    var VERSION = 'v3.0';
    var panelCount = 0;

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function symbol(name) {
        var span = el('span', 'material-symbols-outlined', name);
        span.setAttribute('aria-hidden', 'true');
        return span;
    }

    function pageFile(href) {
        var file = String(href).split('?')[0].split('#')[0].split('/').pop();
        return file === '' ? 'index.html' : file;
    }

    function themeToggleButton() {
        var button = el('button', 'theme-toggle');
        button.type = 'button';
        button.innerHTML =
            '<svg class="icon-moon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>' +
            '<svg class="icon-sun" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">' +
            '<circle cx="12" cy="12" r="4"></circle>' +
            '<path stroke-linecap="round" d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>';
        return button;
    }

    function build(slot) {
        var title = slot.getAttribute('data-title');
        var withBack = slot.getAttribute('data-back') === 'true';
        var currentFile = pageFile(window.location.pathname);

        var header = el('header', 'nh-header');
        var inner = el('div', 'nh-inner');
        var left = el('div', 'nh-left');
        var right = el('div', 'nh-right');

        if (withBack) {
            var back = el('a', 'nh-back');
            back.href = './nerd-universe.html';
            back.appendChild(symbol('arrow_back'));
            back.appendChild(el('span', 'nh-back-label', 'Nerd Universe'));
            left.appendChild(back);
        }

        var brand = el('a', 'nh-brand');
        brand.href = '/';
        var logo = el('img');
        logo.src = LOGO_SRC;
        logo.alt = 'NerdfootballAI';
        brand.appendChild(logo);
        brand.appendChild(el('span', 'nh-wordmark', 'NerdfootballAI'));
        left.appendChild(brand);

        if (title) {
            left.appendChild(el('span', 'nh-title-rule'));
            left.appendChild(el('span', 'nh-title', title));
        }

        right.appendChild(el('span', 'nh-version', VERSION));
        var user = el('span', 'nh-user', 'Loading...');
        right.appendChild(user);
        right.appendChild(themeToggleButton());

        var menu = el('div', 'nh-menu');
        var menuBtn = el('button', 'nh-menu-btn');
        menuBtn.type = 'button';
        menuBtn.setAttribute('aria-label', 'Open navigation menu');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>';

        var panel = el('nav', 'nh-menu-panel');
        panel.id = 'nh-menu-panel-' + (++panelCount);
        panel.setAttribute('aria-label', 'Site navigation');
        panel.hidden = true;
        menuBtn.setAttribute('aria-controls', panel.id);

        NAV_ITEMS.forEach(function (item) {
            var link = el('a', 'nh-menu-item' + (item.featured ? ' featured' : ''));
            link.setAttribute('href', item.href);
            if (pageFile(item.href) === currentFile) link.setAttribute('aria-current', 'page');
            link.appendChild(symbol(item.icon));
            link.appendChild(el('span', 'nh-menu-label', item.label));
            panel.appendChild(link);
        });

        panel.appendChild(el('div', 'nh-menu-divider'));
        var logout = el('button', 'nh-menu-item danger nh-logout');
        logout.type = 'button';
        logout.hidden = true;
        logout.appendChild(symbol('logout'));
        logout.appendChild(el('span', 'nh-menu-label', 'Logout'));
        panel.appendChild(logout);

        menu.appendChild(menuBtn);
        menu.appendChild(panel);
        right.appendChild(menu);

        inner.appendChild(left);
        inner.appendChild(right);
        header.appendChild(inner);

        return { header: header, user: user, menuBtn: menuBtn, panel: panel, logout: logout };
    }

    function mount(slot) {
        if (!slot) return null;
        if (slot.nerdHeader) return slot.nerdHeader;

        var parts = build(slot);
        var logoutHandler = null;

        function isOpen() { return !parts.panel.hidden; }

        function setOpen(open) {
            parts.panel.hidden = !open;
            parts.menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        }

        parts.menuBtn.addEventListener('click', function (event) {
            event.stopPropagation();
            setOpen(!isOpen());
        });

        document.addEventListener('click', function (event) {
            if (!isOpen()) return;
            if (parts.panel.contains(event.target) || parts.menuBtn.contains(event.target)) return;
            setOpen(false);
        });

        document.addEventListener('keydown', function (event) {
            if (event.key !== 'Escape' || !isOpen()) return;
            setOpen(false);
            parts.menuBtn.focus();
        });

        parts.logout.addEventListener('click', function () {
            if (!logoutHandler || !window.confirm('Are you sure you want to logout?')) return;
            setOpen(false);
            logoutHandler();
        });

        slot.textContent = '';
        slot.appendChild(parts.header);
        if (window.NerdTheme && typeof window.NerdTheme.wire === 'function') {
            window.NerdTheme.wire(parts.header);
        }

        var controller = {
            element: parts.header,
            isOpen: isOpen,
            open: function () { setOpen(true); },
            close: function () { setOpen(false); },
            setUser: function (user) {
                var signedIn = !!(user && user.email);
                parts.user.textContent = signedIn ? user.email : 'Not signed in';
                parts.user.classList.toggle('is-signed-in', signedIn);
                parts.user.classList.toggle('is-signed-out', !signedIn);
            },
            setLogoutHandler: function (fn) {
                logoutHandler = typeof fn === 'function' ? fn : null;
                parts.logout.hidden = !logoutHandler;
            }
        };

        slot.nerdHeader = controller;
        return controller;
    }

    function mountAll() {
        var slots = document.querySelectorAll('[data-nerd-header]');
        for (var i = 0; i < slots.length; i++) {
            var controller = mount(slots[i]);
            if (!window.NerdHeader.current) window.NerdHeader.current = controller;
        }
    }

    window.NerdHeader = {
        NAV_ITEMS: NAV_ITEMS,
        mount: mount,
        current: null
    };

    mountAll();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountAll);
    }
})();
