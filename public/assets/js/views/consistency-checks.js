/**
 * Controllo di coerenza: raccoglie in un solo elenco le incongruenze di tutto il caso.
 * Nessun disegno qui: checkCase(data) → [{ id, level, area, text, links: [{ entity, id, label }] }]
 *   level: danger (errore), warning (da controllare), info (suggerimento)
 * L'id è stabile, così un avviso "ignorato" resta ignorato finché la situazione non cambia.
 */
import { caseAnalysis } from './analysis.js';
import { custodyIssues } from './clues.js';
import { movementChecks } from './space-routes.js';

export const AREAS = {
    characters: 'Personaggi',
    timeline: 'Timeline e spostamenti',
    clues: 'Indizi',
    alibis: 'Sospettati e alibi',
    fairplay: 'Fair play',
    knowledge: 'Conoscenze e bugie',
    chapters: 'Capitoli',
    family: 'Famiglie e patrimonio',
    writing: 'Scrittura',
};

/** "12/03/1931", "1931-03-12", "primavera 1931" → { date, year } (date solo se completa). */
export function parseLooseDate(text) {
    if (!text) return null;
    const s = String(text);
    let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return { date: new Date(+m[1], +m[2] - 1, +m[3]), year: +m[1] };
    m = s.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
    if (m) return { date: new Date(+m[3], +m[2] - 1, +m[1]), year: +m[3] };
    m = s.match(/\b(\d{4})\b/);
    return m ? { date: null, year: +m[1] } : null;
}

const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
const nums = (list) => list.filter((n) => n !== null && n !== undefined);

export function checkCase(d) {
    const issues = [];
    const add = (id, level, area, text, links = []) => issues.push({ id, level, area, text, links });
    const ctx = caseAnalysis({ characters: d.characters, places: d.places, events: d.events, participants: d.event_participants, routes: d.routes });
    const { charName, placeName } = ctx;
    const C = (id) => ({ entity: 'characters', id, label: charName(id) });
    const E = (e) => ({ entity: 'events', id: e.id, label: e.title });
    const byId = (list, id) => list.find((x) => x.id === id) ?? null;

    const lastChapter = Math.max(0, ...nums([
        ...d.chapters.map((c) => c.number), ...d.events.map((e) => e.chapter),
        ...d.clues.flatMap((c) => [c.found_chapter, c.revealed_chapter]), ...d.lies.flatMap((l) => [l.told_chapter, l.exposed_chapter]),
    ]));

    // --- Personaggi: nascita e morte --------------------------------------------------------------------
    d.characters.forEach((c) => {
        const born = parseLooseDate(c.born);
        const died = parseLooseDate(c.died);
        if (c.status === 'alive' && died) add(`alive-died:${c.id}`, 'warning', 'characters', `${c.name} ha una data di morte ma lo stato è «Vivo».`, [C(c.id)]);
        if (born && died && died.year < born.year) add(`born-died:${c.id}`, 'danger', 'characters', `${c.name} muore (${c.died}) prima di nascere (${c.born}).`, [C(c.id)]);
        ctx.presences(c.id).forEach((p) => {
            if (died && (died.date ? p.start > endOfDay(died.date) : p.start.getFullYear() > died.year)) {
                add(`after-death:${c.id}:${p.event.id}`, 'danger', 'characters', `${c.name} partecipa a «${p.event.title}» dopo la sua morte (${c.died}).`, [C(c.id), E(p.event)]);
            }
            if (born && (born.date ? p.start < born.date : p.start.getFullYear() < born.year)) {
                add(`before-birth:${c.id}:${p.event.id}`, 'danger', 'characters', `${c.name} partecipa a «${p.event.title}» prima di nascere (${c.born}).`, [C(c.id), E(p.event)]);
            }
        });
    });

    // --- Timeline e spostamenti ------------------------------------------------------------------------------
    d.characters.forEach((c) => {
        const list = ctx.presences(c.id);
        for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
                const a = list[i];
                const b = list[j];
                if (b.start > a.end) break;
                if (!a.placeId || !b.placeId || a.placeId === b.placeId || ctx.samePlace(a.placeId, b.placeId)) continue;
                if (a.start < b.end && b.start < a.end || a.start.getTime() === b.start.getTime()) {
                    add(`overlap:${c.id}:${a.event.id}:${b.event.id}`, 'danger', 'timeline',
                        `${c.name} è in due luoghi nello stesso momento: «${a.event.title}» (${placeName(a.placeId)}) e «${b.event.title}» (${placeName(b.placeId)}).`, [C(c.id), E(a.event), E(b.event)]);
                }
            }
        }
    });
    movementChecks(d.events, d.event_participants, d.characters, ctx.network).forEach((m) => {
        if (m.gap < 0) return; // già segnalato come sovrapposizione
        const key = `move:${m.characterId}:${m.from.event.id}:${m.to.event.id}`;
        if (m.status === 'impossible') {
            add(key, 'danger', 'timeline', `${charName(m.characterId)} non fa in tempo ad andare da ${placeName(m.from.placeId)} a ${placeName(m.to.placeId)}: ha ${Math.round(m.gap)} min, ne servono ${m.need}.`,
                [C(m.characterId), E(m.from.event), E(m.to.event)]);
        } else if (m.status === 'unknown') {
            add(key, 'info', 'timeline', `Tempo di percorrenza sconosciuto tra ${placeName(m.from.placeId)} e ${placeName(m.to.placeId)} (spostamento di ${charName(m.characterId)}).`,
                [C(m.characterId), E(m.from.event), E(m.to.event)]);
        }
    });
    d.events.filter((e) => e.kind !== 'false').forEach((e) => {
        if (!d.event_participants.some((p) => p.event_id === e.id)) add(`ev-nobody:${e.id}`, 'info', 'timeline', `«${e.title}» non ha partecipanti.`, [E(e)]);
        if (!e.place_id) add(`ev-noplace:${e.id}`, 'info', 'timeline', `«${e.title}» non ha un luogo: i controlli sugli spostamenti lo ignorano.`, [E(e)]);
    });

    // --- Indizi -----------------------------------------------------------------------------------------------------
    d.clues.forEach((c) => {
        const K = { entity: 'clues', id: c.id, label: c.title };
        const chain = custodyIssues(d.custody_steps.filter((s) => s.clue_id === c.id), charName);
        chain.steps.forEach((s) => (chain.issues.get(s.id) ?? []).filter((i) => i.level !== 'info').forEach((i, k) => {
            add(`custody:${s.id}:${k}`, i.level, 'clues', `«${c.title}», catena di custodia: ${i.text}`, [K, { entity: 'custody_steps', id: s.id, label: 'passaggio' }]);
        }));
        if (c.classification === 'real' && c.found_chapter !== null && c.revealed_chapter === null) {
            add(`clue-unexplained:${c.id}`, 'info', 'clues', `Indizio reale «${c.title}» scoperto al cap. ${c.found_chapter} ma mai spiegato.`, [K]);
        }
        if (c.classification === 'red_herring' && !c.planted_by_id) add(`clue-noplanter:${c.id}`, 'info', 'clues', `Falsa pista «${c.title}»: chi l'ha messa lì?`, [K]);
        if (c.classification !== 'real' && !c.true_meaning) add(`clue-notruth:${c.id}`, 'info', 'clues', `«${c.title}» è una falsa pista o un errore, ma manca «cosa significa davvero».`, [K]);
    });

    // --- Sospettati e alibi ------------------------------------------------------------------------------------------
    const crimes = [...new Set(d.suspects.map((s) => s.crime_event_id))].map((id) => byId(d.events, id)).filter(Boolean);
    const culprits = [];
    crimes.forEach((crime) => {
        const list = d.suspects.filter((s) => s.crime_event_id === crime.id);
        const guilty = list.filter((s) => s.is_culprit);
        if (!guilty.length) add(`no-culprit:${crime.id}`, 'warning', 'alibis', `«${crime.title}» ha dei sospettati ma nessun colpevole indicato.`, [E(crime)]);
        if (guilty.length > 1) add(`many-culprits:${crime.id}`, 'info', 'alibis', `«${crime.title}» ha ${guilty.length} colpevoli: è voluto (complicità)?`, [E(crime)]);
        guilty.forEach((s) => {
            culprits.push({ ...s, crime });
            const opp = ctx.opportunity(crime, s.character_id);
            if (opp.status === 'elsewhere' || opp.status === 'impossible') {
                add(`culprit-away:${s.id}`, 'danger', 'alibis', `Il colpevole ${charName(s.character_id)} non poteva commettere «${crime.title}»: ${opp.text}`, [C(s.character_id), E(crime)]);
            }
            if (s.means_access === 'none') add(`culprit-nomeans:${s.id}`, 'warning', 'alibis', `Il colpevole ${charName(s.character_id)} non ha accesso al mezzo.`, [C(s.character_id), { entity: 'suspects', id: s.id, label: 'sospettato' }]);
            if (s.motive_strength === 'none') add(`culprit-nomotive:${s.id}`, 'warning', 'alibis', `Il colpevole ${charName(s.character_id)} non ha un movente.`, [C(s.character_id), { entity: 'suspects', id: s.id, label: 'sospettato' }]);
            d.alibis.filter((a) => a.character_id === s.character_id && a.event_id === crime.id && a.status === 'solid' && a.broken_chapter === null).forEach((a) => {
                add(`culprit-solid:${a.id}`, 'warning', 'alibis', `Il colpevole ${charName(s.character_id)} ha un alibi «Solido» che non crolla mai.`, [C(s.character_id), { entity: 'alibis', id: a.id, label: 'alibi' }]);
            });
        });
    });
    d.alibis.forEach((a) => ctx.alibiIssues(a).filter((i) => i.level !== 'info').forEach((i, k) => {
        add(`alibi:${a.id}:${k}`, i.level, 'alibis', `Alibi di ${charName(a.character_id)}: ${i.text}`, [C(a.character_id), { entity: 'alibis', id: a.id, label: 'alibi' }]);
    }));

    // --- Fair play ----------------------------------------------------------------------------------------------------
    if (d.clues.length && !d.clues.some((c) => c.classification === 'real')) {
        add('no-real-clues', 'warning', 'fairplay', 'Nessun indizio reale: il lettore non ha modo di arrivare alla soluzione.');
    }
    culprits.forEach((s) => {
        const id = s.character_id;
        const first = Math.min(Infinity, ...nums([
            ...d.event_participants.filter((p) => p.character_id === id).map((p) => byId(d.events, p.event_id)?.chapter),
            ...d.chapters.filter((c) => c.pov_character_id === id).map((c) => c.number),
            ...d.clues.filter((c) => c.points_to_id === id).map((c) => c.found_chapter),
            ...d.alibis.filter((a) => a.character_id === id).map((a) => a.given_chapter),
            ...d.lies.filter((l) => l.liar_id === id).map((l) => l.told_chapter),
        ]));
        if (first === Infinity) add(`culprit-absent:${s.id}`, 'warning', 'fairplay', `Il colpevole ${charName(id)} non compare in nessun capitolo (eventi raccontati, POV, indizi, alibi, bugie).`, [C(id)]);
        else if (lastChapter >= 4 && first > lastChapter / 2) add(`culprit-late:${s.id}`, 'warning', 'fairplay', `Il colpevole ${charName(id)} compare per la prima volta al cap. ${first} su ${lastChapter}: il lettore deve poterlo conoscere prima.`, [C(id)]);
        if (d.clues.length && !d.clues.some((c) => c.classification === 'real' && (c.points_to_id === id || c.planted_by_id === id))) {
            add(`culprit-noclue:${s.id}`, 'info', 'fairplay', `Nessun indizio reale collegato al colpevole ${charName(id)} (campo «Sembra indicare»).`, [C(id)]);
        }
    });
    d.chapters.filter((ch) => ch.pov_character_id).forEach((ch) => {
        d.facts.forEach((f) => {
            const k = d.knowledge.find((x) => x.fact_id === f.id && x.character_id === ch.pov_character_id && x.level === 'knows');
            const povKnows = k && (k.chapter === null || k.chapter <= ch.number);
            const readerKnows = f.reader_chapter !== null && f.reader_chapter <= ch.number;
            if (povKnows && !readerKnows) {
                add(`pov-hides:${f.id}:${ch.pov_character_id}`, 'info', 'fairplay',
                    `Il POV ${charName(ch.pov_character_id)} sa «${f.title}» già al cap. ${ch.number}, ma il lettore ${f.reader_chapter === null ? 'non lo scopre mai' : `lo scopre solo al cap. ${f.reader_chapter}`}.`,
                    [C(ch.pov_character_id), { entity: 'facts', id: f.id, label: f.title }, { entity: 'chapters', id: ch.id, label: `cap. ${ch.number}` }]);
            }
        });
    });

    // --- Conoscenze e bugie ----------------------------------------------------------------------------------------------
    const knowsAt = (factId, charId) => {
        const k = d.knowledge.find((x) => x.fact_id === factId && x.character_id === charId);
        return k ? (k.chapter ?? 0) : null;
    };
    d.knowledge.filter((k) => k.source_id).forEach((k) => {
        const fact = byId(d.facts, k.fact_id);
        const since = knowsAt(k.fact_id, k.source_id);
        const links = [C(k.character_id), C(k.source_id), { entity: 'facts', id: k.fact_id, label: fact?.title ?? 'informazione' }];
        if (since === null) add(`source-unaware:${k.id}`, 'warning', 'knowledge', `${charName(k.character_id)} sa «${fact?.title}» da ${charName(k.source_id)}, che però non lo sa.`, links);
        else if (k.chapter !== null && since > k.chapter) add(`source-late:${k.id}`, 'warning', 'knowledge', `${charName(k.character_id)} lo sa da ${charName(k.source_id)} al cap. ${k.chapter}, ma ${charName(k.source_id)} lo scopre solo al cap. ${since}: «${fact?.title}».`, links);
    });
    d.lies.forEach((l) => {
        const L = { entity: 'lies', id: l.id, label: 'bugia' };
        if (l.exposed_chapter === null) add(`lie-open:${l.id}`, 'info', 'knowledge', `La bugia di ${charName(l.liar_id)} («${l.statement.slice(0, 60)}») non viene mai smascherata.`, [C(l.liar_id), L]);
        if (l.exposed_by_id && l.fact_id && l.exposed_chapter !== null) {
            const since = knowsAt(l.fact_id, l.exposed_by_id);
            if (since === null || since > l.exposed_chapter) {
                add(`lie-exposer:${l.id}`, 'warning', 'knowledge', `${charName(l.exposed_by_id)} smaschera la bugia al cap. ${l.exposed_chapter} senza conoscere l'informazione che nasconde${since !== null ? ` (la scopre al cap. ${since})` : ''}.`, [C(l.exposed_by_id), L]);
            }
        }
    });

    // --- Capitoli ----------------------------------------------------------------------------------------------------------
    if (d.chapters.length) {
        const numbers = new Set(d.chapters.map((c) => c.number));
        const max = Math.max(...numbers);
        const missing = [];
        for (let n = Math.min(1, ...numbers); n <= max; n++) if (!numbers.has(n)) missing.push(n);
        if (missing.length) add(`ch-missing:${missing.join(',')}`, 'info', 'chapters', `Capitoli senza scheda: ${missing.join(', ')}.`);
        const noPov = d.chapters.filter((c) => !c.pov_character_id).map((c) => c.number);
        if (noPov.length) add(`ch-nopov:${noPov.join(',')}`, 'info', 'chapters', `Capitoli senza punto di vista: ${noPov.join(', ')}.`);
        const beyond = nums([...d.events.map((e) => e.chapter), ...d.clues.flatMap((c) => [c.found_chapter, c.revealed_chapter])]).filter((n) => n > max);
        if (beyond.length) add(`ch-beyond:${[...new Set(beyond)].join(',')}`, 'warning', 'chapters', `Ci sono eventi o indizi nei capitoli ${[...new Set(beyond)].sort((a, b) => a - b).join(', ')}, oltre l'ultimo capitolo con scheda (${max}).`);
    }

    // --- Famiglie e patrimonio --------------------------------------------------------------------------------------------
    d.lineages.forEach((l) => {
        const parent = byId(d.characters, l.parent_id);
        const child = byId(d.characters, l.child_id);
        const pb = parseLooseDate(parent?.born);
        const cb = parseLooseDate(child?.born);
        const pd = parseLooseDate(parent?.died);
        const links = [C(l.parent_id), C(l.child_id)];
        if (pb && cb && pb.year >= cb.year) add(`lineage-age:${l.id}`, 'danger', 'family', `${charName(l.parent_id)} (nato ${parent.born}) non può essere genitore di ${charName(l.child_id)} (nato ${child.born}).`, links);
        else if (pb && cb && cb.year - pb.year < 14) add(`lineage-young:${l.id}`, 'warning', 'family', `${charName(l.parent_id)} avrebbe avuto ${cb.year - pb.year} anni alla nascita di ${charName(l.child_id)}.`, links);
        if (pd && cb && cb.year > pd.year + 1) add(`lineage-dead:${l.id}`, 'danger', 'family', `${charName(l.child_id)} nasce (${child.born}) dopo la morte di ${charName(l.parent_id)} (${parent.died}).`, links);
    });
    d.assets.forEach((a) => {
        const total = d.ownerships.filter((o) => o.asset_id === a.id && o.to_chapter === null).reduce((sum, o) => sum + (o.share ?? 0), 0);
        if (total > 0 && Math.abs(total - 100) > 0.01) {
            add(`shares:${a.id}:${total}`, 'warning', 'family', `Le quote finali di «${a.name}» sommano al ${Math.round(total * 100) / 100}% invece del 100%.`, [{ entity: 'assets', id: a.id, label: a.name }]);
        }
    });

    // --- Scrittura ------------------------------------------------------------------------------------------------------------
    const urgent = d.ideas.filter((i) => i.status === 'open' && i.priority === 'high');
    if (urgent.length) add(`ideas-high:${urgent.map((i) => i.id).join(',')}`, 'info', 'writing', `${urgent.length} idee ad alta priorità ancora da collocare.`, urgent.slice(0, 5).map((i) => ({ entity: 'ideas', id: i.id, label: i.title })));
    d.tropes.filter((t) => t.status === 'planned').forEach((t) => add(`trope-planned:${t.id}`, 'info', 'writing', `«${t.name}» è ancora solo previsto.`, [{ entity: 'tropes', id: t.id, label: t.name }]));
    d.tropes.filter((t) => t.status === 'avoided' && d.trope_links.some((l) => l.trope_id === t.id)).forEach((t) => {
        add(`trope-avoided:${t.id}`, 'warning', 'writing', `«${t.name}» è segnato «Da evitare» ma è collegato a personaggi o capitoli.`, [{ entity: 'tropes', id: t.id, label: t.name }]);
    });

    // Una sola voce per id (lo stesso fatto può emergere da più capitoli)
    const unique = new Map();
    issues.forEach((i) => { if (!unique.has(i.id)) unique.set(i.id, i); });
    return [...unique.values()];
}

export const CHECK_ENTITIES = [
    'characters', 'places', 'events', 'event_participants', 'routes', 'clues', 'custody_steps', 'suspects', 'alibis', 'lies',
    'facts', 'knowledge', 'chapters', 'lineages', 'ownerships', 'assets', 'ideas', 'tropes', 'trope_links',
];

