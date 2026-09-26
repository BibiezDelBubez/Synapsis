/**
 * Cursore "Stato al capitolo N" condiviso dalle viste che mostrano dati che cambiano nel corso della storia
 * (legami, proprietà…). Il valore null significa "stato finale" (ultimo capitolo noto).
 *
 *   const slider = chapterSlider({ onChange: () => draw(), emptyText: '…' });
 *   slider.setRange(maxCapitolo, ciSonoDati);
 *   slider.current   // capitolo mostrato
 *   slider.value     // null se si è sullo stato finale
 *   slider.step(-1)  // capitolo precedente
 */
import { h, icon } from './dom.js';

export function chapterSlider({ onChange, emptyText = 'Nessun cambiamento registrato' }) {
    let max = 0;
    let value = null;
    let hasData = false;

    const input = h('input', { type: 'range', class: 'form-range chapter-range', min: 0, max: 0, step: 1, value: 0, 'aria-label': 'Capitolo' });
    const label = h('span', { class: 'chapter-label' });
    const el = h('div', { class: 'chapter-control' }, icon('fa-clock-rotate-left', 'text-body-secondary'), input, label);

    function render() {
        input.max = String(max);
        input.value = String(value ?? max);
        input.disabled = !hasData;
        if (!hasData) {
            label.textContent = emptyText;
            return;
        }
        const ch = value ?? max;
        label.replaceChildren('Stato al capitolo ', h('strong', {}, String(ch)),
            ...(ch === max ? [h('span', { class: 'text-body-tertiary ms-1' }, '(finale)')] : []));
    }

    function set(chapter) {
        const ch = Math.max(0, Math.min(max, chapter));
        value = ch === max ? null : ch;
        render();
        onChange?.(value);
    }

    input.addEventListener('input', () => set(Number(input.value)));

    return {
        el,
        setRange(newMax, newHasData = newMax > 0) {
            max = Math.max(0, newMax);
            hasData = newHasData;
            if (value !== null && value > max) value = null;
            render();
        },
        step(delta) {
            if (hasData) set((value ?? max) + delta);
        },
        get value() {
            return value;
        },
        get current() {
            return value ?? max;
        },
    };
}
