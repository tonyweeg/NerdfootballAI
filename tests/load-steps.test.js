/**
 * @jest-environment jsdom
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '../public/js/components/load-steps.js'), 'utf8');

const STEPS = [
    { key: 'auth', label: 'Signed in' },
    { key: 'membership', label: 'Pool membership' },
    { key: 'status', label: 'Survivor status' }
];

function mount(options) {
    delete window.NerdLoadSteps;
    document.body.innerHTML = '<section id="loader"><div id="steps"></div></section>';
    window.eval(SRC);
    return window.NerdLoadSteps.mount(document.getElementById('steps'), STEPS, {
        root: document.getElementById('loader'),
        ...options
    });
}

const q = (sel) => document.querySelector(sel);
const stepEl = (key) => q(`[data-step="${key}"]`);
const icon = (key) => stepEl(key).querySelector('.material-symbols-outlined').textContent;

describe('rendering', () => {
    test('one pending item per step, labels as text, in order', () => {
        mount();
        const items = [...document.querySelectorAll('.ls-step')];
        expect(items.map((li) => [li.dataset.step, li.dataset.state, li.querySelector('.ls-label').textContent]))
            .toEqual([['auth', 'pending', 'Signed in'], ['membership', 'pending', 'Pool membership'], ['status', 'pending', 'Survivor status']]);
        expect(icon('auth')).toBe('radio_button_unchecked');
    });

    test('labels are never parsed as HTML', () => {
        delete window.NerdLoadSteps;
        document.body.innerHTML = '<div id="steps"></div>';
        window.eval(SRC);
        window.NerdLoadSteps.mount(document.getElementById('steps'), [{ key: 'x', label: '<img src=x onerror=alert(1)>' }]);
        expect(q('.ls-label').textContent).toBe('<img src=x onerror=alert(1)>');
        expect(q('.ls-label img')).toBeNull();
    });

    test('the list announces progress politely and the root is marked busy', () => {
        mount();
        expect(q('.ls-list').getAttribute('aria-live')).toBe('polite');
        expect(q('#loader').getAttribute('aria-busy')).toBe('true');
    });
});

describe('state changes', () => {
    test('start, done and skip update state, icon and the current marker', () => {
        const steps = mount();
        steps.start('auth');
        expect(stepEl('auth').dataset.state).toBe('active');
        expect(stepEl('auth').getAttribute('aria-current')).toBe('step');
        expect(icon('auth')).toBe('progress_activity');

        steps.done('auth');
        expect(steps.state('auth')).toBe('done');
        expect(stepEl('auth').hasAttribute('aria-current')).toBe(false);
        expect(icon('auth')).toBe('check_circle');

        steps.skip('membership');
        expect(steps.state('membership')).toBe('skipped');
        expect(icon('membership')).toBe('remove_circle_outline');
    });

    test('unknown step keys throw, so a typo cannot silently stall the loader', () => {
        const steps = mount();
        expect(() => steps.start('nope')).toThrow('NerdLoadSteps: unknown step "nope"');
    });
});

describe('failure', () => {
    test('marks the step, shows the message and a retry button that calls back', () => {
        const onRetry = jest.fn();
        const steps = mount({ onRetry });
        steps.start('status');
        steps.fail('status', 'Survivor service unavailable');

        expect(steps.state('status')).toBe('failed');
        expect(icon('status')).toBe('error');
        expect(q('#loader').dataset.state).toBe('failed');
        expect(q('#loader').getAttribute('aria-busy')).toBe('false');
        expect(q('.ls-error').getAttribute('role')).toBe('alert');
        expect(q('.ls-error-message').textContent).toBe('Survivor service unavailable');

        q('.ls-retry').click();
        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    test('no retry button without a retry handler', () => {
        const steps = mount();
        steps.fail('auth', 'Please sign in');
        expect(q('.ls-error-message').textContent).toBe('Please sign in');
        expect(q('.ls-retry')).toBeNull();
    });

    test('a second failure replaces the message instead of stacking alerts', () => {
        const steps = mount({ onRetry: () => {} });
        steps.fail('auth', 'first');
        steps.fail('membership', 'second');
        expect(document.querySelectorAll('.ls-error')).toHaveLength(1);
        expect(q('.ls-error-message').textContent).toBe('second');
    });
});

describe('finish', () => {
    test('hides the root and clears busy', () => {
        const steps = mount();
        steps.done('auth');
        steps.finish();
        expect(q('#loader').hidden).toBe(true);
        expect(q('#loader').getAttribute('aria-busy')).toBe('false');
    });

    test('without a root option, finish hides the mounted element', () => {
        delete window.NerdLoadSteps;
        document.body.innerHTML = '<div id="steps"></div>';
        window.eval(SRC);
        const steps = window.NerdLoadSteps.mount(document.getElementById('steps'), STEPS);
        steps.finish();
        expect(document.getElementById('steps').hidden).toBe(true);
    });
});
