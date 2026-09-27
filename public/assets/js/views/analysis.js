/**
 * Analisi condivise sui dati del caso (usate dalla Matrice e alibi e dal Controllo di coerenza).
 *
 *   const ctx = caseAnalysis({ characters, places, events, participants: event_participants, routes });
 *   ctx.presences(characterId)        dove si trova davvero un personaggio (eventi della timeline)
 *   ctx.opportunity(crime, charId)    sul posto / altrove / impossibile / possibile / da verificare
 *   ctx.alibiIssues(alibi)            controlli automatici su un alibi
 */
import { formatMinutes, parseDateTime, travelNetwork } from './space-routes.js';

export function caseAnalysis(data) {
    const state = {
        characters: data.characters ?? [], places: data.places ?? [], events: data.events ?? [], participants: data.participants ?? [],
        network: travelNetwork(data.places ?? [], data.routes ?? []),
    };
    const charName = (id) => state.characters.find((c) => c.id === id)?.name ?? `#${id}`;
    const placeName = (id) => state.places.find((p) => p.id === id)?.name ?? `#${id}`;
    const eventById = (id) => state.events.find((e) => e.id === id) ?? null;

    // --- Presenze reali dalla timeline ----------------------------------------------------------------
    /** Dove si trova davvero un personaggio: eventi accaduti (non falsi) con orario verità, esclusi i "dichiara di esserci". */
    function presences(characterId) {
        return state.participants
            .filter((p) => p.character_id === characterId && p.role !== 'claimed')
            .map((p) => eventById(p.event_id))
            .filter((e) => e && e.kind !== 'false' && e.real_start)
            .map((e) => {
                const start = parseDateTime(e.real_start);
                return { event: e, placeId: e.place_id, start, end: parseDateTime(e.real_end) ?? start };
            })
            .sort((a, b) => a.start - b.start);
    }
    const overlaps = (p, s, t) => p.start <= t && p.end >= s;
    const samePlace = (a, b) => a && b && state.network.best(a, b)?.minutes === 0;

    /** Opportunità reale di un personaggio rispetto a un delitto. */
    function opportunity(crime, characterId) {
        if (!crime.real_start) return { status: 'unknown', text: 'Il delitto non ha un orario verità.' };
        const S = parseDateTime(crime.real_start);
        const T = parseDateTime(crime.real_end) ?? S;
        const P = crime.place_id;
        const all = presences(characterId);
        if (all.some((p) => p.event.id === crime.id)) return { status: 'present', text: 'Partecipa al delitto nella timeline.' };

        const list = all.filter((p) => p.event.id !== crime.id);
        const busy = list.find((p) => overlaps(p, S, T));
        if (busy) {
            if (P && samePlace(busy.placeId, P)) return { status: 'present', text: `Nello stesso luogo: ${busy.event.title}.`, placeId: busy.placeId };
            return { status: 'elsewhere', text: `Nello stesso momento: ${busy.event.title}${busy.placeId ? ` (${placeName(busy.placeId)})` : ''}.`, placeId: busy.placeId };
        }
        if (!P) return { status: 'possible', text: 'Il delitto non ha un luogo: nessun controllo sui tempi.' };

        const prev = [...list].reverse().find((p) => p.end <= S);
        const next = list.find((p) => p.start >= T);
        const notes = [];
        let unknown = false;
        for (const [p, from, to, gap] of [
            [prev, prev?.placeId, P, prev ? (S - prev.end) / 60000 : 0],
            [next, P, next?.placeId, next ? (next.start - T) / 60000 : 0],
        ]) {
            if (!p || !p.placeId) continue;
            const route = state.network.best(from, to);
            const label = p === prev ? `Da «${p.event.title}»` : `Verso «${p.event.title}»`;
            if (!route) {
                unknown = true;
                notes.push(`${label}: percorso ${placeName(from)} → ${placeName(to)} sconosciuto.`);
            } else if (route.minutes > gap) {
                return { status: 'impossible', text: `${label}: servono ${formatMinutes(route.minutes)}, ha solo ${formatMinutes(gap)}.` };
            } else {
                notes.push(`${label}: ${formatMinutes(gap)} disponibili, ${route.minutes ? `ne servono ${formatMinutes(route.minutes)}` : 'stesso edificio'}.`);
            }
        }
        if (unknown) return { status: 'unknown', text: notes.join(' ') };
        return { status: 'possible', text: notes.length ? notes.join(' ') : 'Nessun impedimento nella timeline.' };
    }

    /** Controlli automatici su un alibi. */
    function alibiIssues(a) {
        const issues = [];
        const add = (level, text) => issues.push({ level, text });
        const ev = eventById(a.event_id);
        const S = parseDateTime(a.start_at ?? ev?.real_start);
        const T = parseDateTime(a.end_at ?? a.start_at ?? ev?.real_end ?? ev?.real_start) ?? S;

        if (a.witness_id === a.character_id) add('warning', 'Il testimone è la persona stessa.');
        if (a.status === 'solid' && !a.witness_id) add('info', 'Solido ma senza testimone.');
        if (a.status === 'solid' && a.broken_chapter !== null) add('warning', `Crolla al capitolo ${a.broken_chapter} ma è segnato come solido.`);
        if (!S) {
            add('info', 'Senza orario: impossibile confrontarlo con la timeline.');
            return issues;
        }
        const contradiction = presences(a.character_id).find((p) => overlaps(p, S, T) && p.placeId && a.claimed_place_id
            && p.placeId !== a.claimed_place_id && !samePlace(p.placeId, a.claimed_place_id));
        if (contradiction) {
            add(a.status === 'solid' ? 'danger' : 'warning',
                `Smentito dalla timeline: era a ${placeName(contradiction.placeId)} (${contradiction.event.title}).${a.status === 'solid' ? ' Eppure è segnato come solido.' : ''}`);
        } else if (a.status === 'false') {
            add('info', 'Falso, ma la timeline non mostra dove fosse davvero: aggiungi l\'evento reale.');
        }
        if (a.witness_id && a.witness_id !== a.character_id && a.claimed_place_id) {
            const away = presences(a.witness_id).find((p) => overlaps(p, S, T) && p.placeId
                && p.placeId !== a.claimed_place_id && !samePlace(p.placeId, a.claimed_place_id));
            if (away) add('warning', `Il testimone ${charName(a.witness_id)} era altrove: ${placeName(away.placeId)} (${away.event.title}).`);
        }
        return issues;
    }

    return { network: state.network, charName, placeName, eventById, presences, overlaps, samePlace, opportunity, alibiIssues };
}
