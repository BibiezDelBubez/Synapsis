/**
 * Pagina «non trovata» della SPA: il detective sotto il lampione esamina le orme, che si perdono
 * nel buio oltre la luce; accanto, una citazione casuale su ciò che manca, è scomparso o non c'è più.
 * Le citazioni di Conan Doyle e Poe sono di pubblico dominio (traduzione libera); le altre sono fatti storici.
 *
 * L'illustrazione (public/assets/img/detective.svg) viene inserita nella pagina come SVG,
 * così il CSS può animarne le parti (classi nf-*: orme, stelle, luce del lampione).
 */
import { url } from './api.js';
import { h, icon } from './dom.js';

const QUOTES = [
    { text: 'Il cervello di un uomo è all\'origine come una piccola soffitta vuota: bisogna arredarla con i mobili che si scelgono. Lo sciocco ci ammassa ogni cianfrusaglia, e ciò che gli servirebbe finisce sepolto.', source: 'Arthur Conan Doyle, Uno studio in rosso (1887) — la «teoria della soffitta»' },
    { text: '«Vorrei richiamare la sua attenzione sul curioso episodio del cane, quella notte.» «Il cane non fece nulla, quella notte.» «Fu proprio quello il curioso episodio.»', source: 'Arthur Conan Doyle, Silver Blaze (1892)' },
    { text: 'Eliminato l\'impossibile, ciò che resta, per quanto improbabile, deve essere la verità.', source: 'Arthur Conan Doyle, Il segno dei quattro (1890)' },
    { text: 'È un errore capitale teorizzare prima di avere i dati.', source: 'Arthur Conan Doyle, Uno scandalo in Boemia (1891)' },
    { text: 'Lei vede, ma non osserva.', source: 'Arthur Conan Doyle, Uno scandalo in Boemia (1891)' },
    { text: 'Non c\'è niente di più ingannevole di un fatto ovvio.', source: 'Arthur Conan Doyle, Il mistero di Boscombe Valley (1891)' },
    { text: 'Tutto ciò che vediamo o sembriamo non è che un sogno dentro un sogno.', source: 'Edgar Allan Poe, Un sogno dentro un sogno (1849)' },
    { text: 'Nel dicembre 1872 la Mary Celeste fu trovata alla deriva nell\'Atlantico, in buone condizioni e con provviste a bordo. Dell\'equipaggio, nessuna traccia.', source: 'Il mistero della Mary Celeste' },
    { text: 'Nel 1590, sull\'isola di Roanoke, della colonia restava solo una parola incisa su un palo: CROATOAN.', source: 'La colonia perduta di Roanoke' },
    { text: 'Nel dicembre 1900 i tre guardiani del faro delle isole Flannan, in Scozia, scomparvero. Il faro era in ordine; mancavano due cerate.', source: 'Il mistero del faro delle Flannan' },
    { text: 'Nel marzo 1938 il fisico Ettore Majorana si imbarcò sul piroscafo Palermo–Napoli. Da allora di lui non si seppe più nulla di certo.', source: 'La scomparsa di Ettore Majorana' },
    { text: 'Nel dicembre 1926 Agatha Christie sparì per undici giorni. La ritrovarono in un albergo di Harrogate, registrata con un altro nome.', source: 'La scomparsa di Agatha Christie' },
    { text: 'Il 2 luglio 1937 Amelia Earhart inviò gli ultimi messaggi radio sopra il Pacifico. Il suo aereo non fu mai ritrovato.', source: 'La scomparsa di Amelia Earhart' },
];

let last = -1;
function pick() {
    let i;
    do { i = Math.floor(Math.random() * QUOTES.length); } while (QUOTES.length > 1 && i === last);
    last = i;
    return QUOTES[i];
}

let artwork = null; // testo dell'SVG, scaricato una volta sola

async function loadArtwork(target) {
    try {
        artwork ??= fetch(url('assets/img/detective.svg')).then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status))));
        target.innerHTML = await artwork; // file statico dell'app, non contenuto dell'utente
    } catch {
        artwork = null;
        target.replaceChildren(h('img', { src: url('assets/img/detective.svg'), alt: '' }));
    }
}

export function renderNotFound(container, path) {
    const text = h('p', { class: 'nf-quote-text' });
    const source = h('footer', { class: 'nf-quote-source' });
    const quote = h('blockquote', { class: 'nf-quote', 'aria-live': 'polite' }, text, source);
    const show = () => {
        const q = pick();
        text.textContent = q.text;
        source.textContent = q.source;
    };
    const scene = h('div', { class: 'nf-scene' });
    const page = h('section', { class: 'not-found' },
        scene,
        h('div', { class: 'nf-text' },
            h('div', { class: 'nf-eyebrow' }, 'Errore 404 · pista interrotta'),
            h('h1', { class: 'nf-title' }, 'Le orme finiscono qui.'),
            h('p', { class: 'nf-lead' }, 'Nessuna pagina a ', h('code', {}, path),
                '. Oltre la luce del lampione non c\'è più traccia: forse non è mai esistita, o qualcuno l\'ha fatta sparire.'),
            quote,
            h('div', { class: 'nf-actions' },
                h('a', { href: url('/'), class: 'btn btn-sm btn-lamp', dataset: { link: '' } }, icon('fa-house', 'me-1'), 'Torna alla dashboard'),
                h('button', { type: 'button', class: 'btn btn-sm btn-night', onclick: () => anotherMystery() }, icon('fa-shuffle', 'me-1'), 'Un altro mistero'))));

    // Il lampione tremola e, al buio, cambia il mistero
    function anotherMystery() {
        page.classList.remove('flicker');
        void page.offsetWidth; // riavvia l'animazione
        page.classList.add('flicker');
        quote.classList.add('swapping');
        setTimeout(() => { show(); quote.classList.remove('swapping'); }, 250);
    }

    show();
    container.replaceChildren(page);
    loadArtwork(scene);
}
