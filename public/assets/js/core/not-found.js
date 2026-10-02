/**
 * Pagina «non trovata» della SPA: Sherlock Holmes e una citazione casuale su ciò che manca,
 * è scomparso o non c'è più. Le citazioni di Conan Doyle e Poe sono di pubblico dominio
 * (traduzione libera); le altre voci sono fatti storici.
 *
 * Illustrazione: «Sherlock Holmes» di Delapouite, game-icons.net, licenza CC BY 3.0
 * (vedi public/assets/img/CREDITS.md).
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

export function renderNotFound(container, path) {
    const text = h('p', { class: 'nf-quote-text' });
    const source = h('footer', { class: 'nf-quote-source' });
    const show = () => {
        const q = pick();
        text.textContent = q.text;
        source.textContent = q.source;
    };
    show();
    container.replaceChildren(h('div', { class: 'not-found' },
        h('div', { class: 'nf-art', role: 'img', 'aria-label': 'Sherlock Holmes con la lente', style: `--nf-img:url("${url('assets/img/sherlock-holmes.svg')}")` }),
        h('div', { class: 'nf-code' }, '404'),
        h('h1', { class: 'h4 mb-1' }, 'Qui non c\'è niente'),
        h('p', { class: 'text-body-secondary mb-4' }, 'Nessuna pagina a ', h('code', {}, path), '. Forse non è mai esistita, o qualcuno l\'ha fatta sparire.'),
        h('blockquote', { class: 'nf-quote' }, text, source),
        h('div', { class: 'd-flex gap-2 justify-content-center flex-wrap mt-3' },
            h('a', { href: url('/'), class: 'btn btn-sm btn-primary', dataset: { link: '' } }, icon('fa-house', 'me-1'), 'Torna alla dashboard'),
            h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', onclick: show }, icon('fa-shuffle', 'me-1'), 'Un altro mistero'))));
}
