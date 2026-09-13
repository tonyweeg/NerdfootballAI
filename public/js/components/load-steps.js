/**
 * NerdFootball load steps (NERD-27) — a checklist of a page's real loading
 * steps that ticks off as each finishes, with a failure message and Retry.
 * Pairs with css/nerd-loading.css. Knows nothing about Firebase.
 *
 *   const steps = NerdLoadSteps.mount(listEl, [{ key: 'auth', label: 'Signed in' }], {
 *       root: loaderSectionEl,          // hidden by finish(); defaults to listEl
 *       onRetry: () => location.reload()
 *   });
 *   steps.start('auth'); steps.done('auth'); steps.skip('games');
 *   steps.fail('status', 'Survivor service unavailable');
 *   steps.finish();
 */
(function () {
    'use strict';

    var ICONS = {
        pending: 'radio_button_unchecked',
        active: 'progress_activity',
        done: 'check_circle',
        skipped: 'remove_circle_outline',
        failed: 'error'
    };

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function mount(container, steps, options) {
        var opts = options || {};
        var root = opts.root || container;
        var items = {};

        var list = el('ol', 'ls-list');
        list.setAttribute('aria-live', 'polite');

        steps.forEach(function (step) {
            var item = el('li', 'ls-step');
            item.dataset.step = step.key;
            var icon = el('span', 'material-symbols-outlined ls-icon');
            icon.setAttribute('aria-hidden', 'true');
            item.appendChild(icon);
            item.appendChild(el('span', 'ls-label', step.label));
            list.appendChild(item);
            items[step.key] = item;
            setState(step.key, 'pending');
        });

        container.textContent = '';
        container.appendChild(list);
        root.setAttribute('aria-busy', 'true');

        function item(key) {
            if (!items[key]) throw new Error('NerdLoadSteps: unknown step "' + key + '"');
            return items[key];
        }

        function setState(key, state) {
            var node = item(key);
            node.dataset.state = state;
            node.querySelector('.ls-icon').textContent = ICONS[state];
            if (state === 'active') node.setAttribute('aria-current', 'step');
            else node.removeAttribute('aria-current');
        }

        function fail(key, message) {
            setState(key, 'failed');
            root.dataset.state = 'failed';
            root.setAttribute('aria-busy', 'false');

            var existing = container.querySelector('.ls-error');
            if (existing) existing.remove();

            var box = el('div', 'ls-error');
            box.setAttribute('role', 'alert');
            box.appendChild(el('span', 'ls-error-message', message));
            if (typeof opts.onRetry === 'function') {
                var retry = el('button', 'ls-retry', 'Retry');
                retry.type = 'button';
                retry.addEventListener('click', opts.onRetry);
                box.appendChild(retry);
            }
            container.appendChild(box);
        }

        return {
            start: function (key) { setState(key, 'active'); },
            done: function (key) { setState(key, 'done'); },
            skip: function (key) { setState(key, 'skipped'); },
            fail: fail,
            state: function (key) { return item(key).dataset.state; },
            finish: function () {
                root.hidden = true;
                root.setAttribute('aria-busy', 'false');
            }
        };
    }

    window.NerdLoadSteps = { mount: mount };
})();
