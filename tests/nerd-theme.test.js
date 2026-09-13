const fs = require('fs');
const path = require('path');

const CSS = fs.readFileSync(path.join(__dirname, '../public/css/nerd-theme.css'), 'utf8');

function block(selector) {
    const start = CSS.indexOf(`${selector} {`);
    if (start < 0) return null;
    const open = CSS.indexOf('{', start);
    const close = CSS.indexOf('}', open);
    return { start, body: CSS.slice(open + 1, close) };
}

function tokens(body) {
    const out = {};
    for (const [, name, value] of body.matchAll(/(--md-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
        out[name] = value.trim();
    }
    return out;
}

// Elevation shadows are pure black at low alpha — hue-neutral, so an accent
// has no reason to override them. Anything else carrying a colour is hued.
const isNeutralShadow = (value) => /rgb\(/.test(value) && !/#/.test(value) &&
    [...value.matchAll(/rgb\(([^)]*)\)/g)].every(([, inner]) => /^\s*0\s+0\s+0\b/.test(inner));
const isColour = (value) => /#[0-9a-f]{3,8}\b|rgb\(|linear-gradient/i.test(value) && !isNeutralShadow(value);

function hexes(value) {
    return [...value.matchAll(/#([0-9a-f]{6})\b/gi)].map(([, h]) => h);
}

function luminance(hex) {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

const dark = block(':root');
const survivor = block(':root[data-accent="survivor"]');
const light = block(':root[data-theme="light"]');

describe('survivor accent', () => {
    test('exists', () => {
        expect(survivor).not.toBeNull();
    });

    test('is declared before the light theme and the OS-light media block, so light mode always wins', () => {
        expect(survivor.start).toBeGreaterThan(dark.start);
        expect(survivor.start).toBeLessThan(light.start);
        expect(survivor.start).toBeLessThan(CSS.indexOf('@media (prefers-color-scheme: light)'));
    });

    test('overrides every colour token the dark theme defines, so no green leaks through', () => {
        const darkColours = Object.keys(tokens(dark.body)).filter((k) => isColour(tokens(dark.body)[k]));
        const missing = darkColours.filter((k) => !(k in tokens(survivor.body)));
        expect(missing).toEqual([]);
    });

    test('text pairs meet WCAG AA (4.5:1)', () => {
        const t = tokens(survivor.body);
        const pairs = [
            ['--md-on-surface', '--md-background'],
            ['--md-on-surface', '--md-surface'],
            ['--md-on-surface-variant', '--md-surface-container'],
            ['--md-on-surface-muted', '--md-surface'],
            ['--md-on-surface-muted', '--md-surface-container-high'],
            ['--md-primary', '--md-background'],
            ['--md-primary', '--md-surface'],
            ['--md-on-primary-container', '--md-primary-container'],
            ['--md-tertiary', '--md-surface'],
            ['--md-on-tertiary-container', '--md-tertiary-container'],
            ['--md-error', '--md-surface'],
            ['--md-on-error-container', '--md-error-container'],
            ['--md-action-text', '--md-action-bg'],
            ['--md-on-surface', '--md-button-bg']
        ];
        const failures = [];
        for (const [fg, bg] of pairs) {
            for (const f of hexes(t[fg])) {
                for (const b of hexes(t[bg])) {
                    const ratio = contrast(f, b);
                    if (ratio < 4.5) failures.push(`${fg} #${f} on ${bg} #${b}: ${ratio.toFixed(2)}`);
                }
            }
        }
        expect(failures).toEqual([]);
    });

    test('reads as red: primary and surfaces lean red', () => {
        const t = tokens(survivor.body);
        const rgb = (hex) => [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
        for (const name of ['--md-primary', '--md-background', '--md-surface-container']) {
            const [r, g, b] = rgb(hexes(t[name])[0]);
            expect(r).toBeGreaterThan(g);
            expect(r).toBeGreaterThan(b);
        }
    });
});
