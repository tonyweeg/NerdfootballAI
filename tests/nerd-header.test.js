/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://nerdfootball.web.app/leaderboard.html"}
 */
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '../public');
const THEME_SRC = fs.readFileSync(path.join(PUBLIC, 'js/utils/theme-toggle.js'), 'utf8');
const HEADER_SRC = fs.readFileSync(path.join(PUBLIC, 'js/components/nerd-header.js'), 'utf8');

function boot(slotAttrs = 'data-title="Masters Audit" data-back="true"') {
    delete window.NerdTheme;
    delete window.NerdHeader;
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
    document.body.innerHTML = `<div class="nerd-header-slot" data-nerd-header ${slotAttrs}></div><main id="page">page</main>`;
    window.eval(THEME_SRC);
    window.eval(HEADER_SRC);
    return window.NerdHeader.current;
}

const q = (sel) => document.querySelector(sel);
const qa = (sel) => [...document.querySelectorAll(sel)];
const click = (el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));

describe('rendering', () => {
    test('brand, page title, back link, theme toggle and menu button', () => {
        boot();
        expect(q('.nh-header .nh-brand').getAttribute('href')).toBe('/');
        expect(q('.nh-brand img').getAttribute('alt')).toBe('NerdfootballAI');
        expect(q('.nh-title').textContent).toBe('Masters Audit');
        expect(q('.nh-back').getAttribute('href')).toBe('./nerd-universe.html');
        expect(q('.nh-back').textContent).toContain('Nerd Universe');
        expect(q('.nh-header .theme-toggle')).not.toBeNull();
        expect(q('.nh-menu-btn').getAttribute('aria-expanded')).toBe('false');
        expect(q('.nh-menu-btn').getAttribute('aria-controls')).toBe(q('.nh-menu-panel').id);
    });

    test('no back link or title unless asked for', () => {
        boot('');
        expect(q('.nh-back')).toBeNull();
        expect(q('.nh-title')).toBeNull();
    });

    test('title is text, not markup', () => {
        boot('data-title="<img src=x onerror=alert(1)>"');
        expect(q('.nh-title').textContent).toBe('<img src=x onerror=alert(1)>');
        expect(q('.nh-title img')).toBeNull();
    });

    test('every nav item has an icon and a visible text label', () => {
        boot();
        const items = qa('.nh-menu-panel a.nh-menu-item');
        expect(items).toHaveLength(window.NerdHeader.NAV_ITEMS.length);
        expect(items.length).toBeGreaterThanOrEqual(8);
        items.forEach((a) => {
            expect(a.querySelector('.material-symbols-outlined').textContent.trim()).not.toBe('');
            expect(a.querySelector('.nh-menu-label').textContent.trim()).not.toBe('');
        });
    });

    test('nav matches the nerd-universe menu panel exactly (same links, labels, icons, order)', () => {
        const html = fs.readFileSync(path.join(PUBLIC, 'nerd-universe.html'), 'utf8');
        const start = html.indexOf('id="menu-panel"');
        const panel = html.slice(start, html.indexOf('class="menu-divider"', start));
        const universe = [...panel.matchAll(/href="([^"]+)"[^>]*>\s*<span class="material-symbols-outlined"[^>]*>([^<]+)<\/span>\s*([^<]+?)\s*<\/a>/g)]
            .map(([, href, icon, label]) => ({ href, icon: icon.trim(), label: label.trim() }));
        expect(universe.length).toBeGreaterThanOrEqual(8);
        boot();
        expect(window.NerdHeader.NAV_ITEMS.map(({ href, icon, label }) => ({ href, icon, label }))).toEqual(universe);
    });

    test('the current page is marked', () => {
        boot();
        const current = qa('.nh-menu-item[aria-current="page"]');
        expect(current.map((a) => a.getAttribute('href'))).toEqual(['./leaderboard.html']);
    });

    test('mounting twice renders one header', () => {
        const header = boot();
        window.NerdHeader.mount(q('[data-nerd-header]'));
        expect(qa('.nh-header')).toHaveLength(1);
        expect(window.NerdHeader.current).toBe(header);
    });
});

describe('menu', () => {
    test('button toggles the panel', () => {
        const header = boot();
        click(q('.nh-menu-btn'));
        expect(q('.nh-menu-panel').hidden).toBe(false);
        expect(q('.nh-menu-btn').getAttribute('aria-expanded')).toBe('true');
        expect(header.isOpen()).toBe(true);
        click(q('.nh-menu-btn'));
        expect(q('.nh-menu-panel').hidden).toBe(true);
        expect(q('.nh-menu-btn').getAttribute('aria-expanded')).toBe('false');
    });

    test('click outside closes, click inside the panel does not', () => {
        boot();
        click(q('.nh-menu-btn'));
        click(q('.nh-menu-panel .nh-menu-divider'));
        expect(q('.nh-menu-panel').hidden).toBe(false);
        click(q('#page'));
        expect(q('.nh-menu-panel').hidden).toBe(true);
    });

    test('Escape closes and returns focus to the button', () => {
        boot();
        click(q('.nh-menu-btn'));
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(q('.nh-menu-panel').hidden).toBe(true);
        expect(document.activeElement).toBe(q('.nh-menu-btn'));
    });
});

describe('user and logout', () => {
    test('shows the signed-in email or a signed-out state', () => {
        const header = boot();
        header.setUser({ email: 'tony@example.com' });
        expect(q('.nh-user').textContent).toBe('tony@example.com');
        expect(q('.nh-user').classList.contains('is-signed-in')).toBe(true);
        header.setUser(null);
        expect(q('.nh-user').textContent).toBe('Not signed in');
        expect(q('.nh-user').classList.contains('is-signed-out')).toBe(true);
    });

    test('logout is hidden until the page provides a handler', () => {
        const header = boot();
        expect(q('.nh-logout').hidden).toBe(true);
        header.setLogoutHandler(() => {});
        expect(q('.nh-logout').hidden).toBe(false);
    });

    test('logout asks first, then closes the menu and calls the handler', async () => {
        const header = boot();
        const handler = jest.fn();
        header.setLogoutHandler(handler);
        click(q('.nh-menu-btn'));

        window.confirm = jest.fn(() => false);
        click(q('.nh-logout'));
        expect(handler).not.toHaveBeenCalled();

        window.confirm = jest.fn(() => true);
        click(q('.nh-logout'));
        expect(handler).toHaveBeenCalledTimes(1);
        expect(q('.nh-menu-panel').hidden).toBe(true);
    });
});

describe('theme toggle', () => {
    test('one click flips the theme exactly once, even when a second theme script wires the page', () => {
        boot();
        window.NerdTheme.set('dark');
        // A second copy of theme-toggle.js has its own handler function, which
        // addEventListener would NOT dedupe; only the element marker prevents it.
        window.eval(THEME_SRC);
        window.NerdTheme.wire(document);
        click(q('.nh-header .theme-toggle'));
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        click(q('.nh-header .theme-toggle'));
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    test('toggle carries its accessible label', () => {
        boot();
        expect(q('.nh-header .theme-toggle').getAttribute('aria-label')).toBe('Switch between light and dark theme');
    });
});
