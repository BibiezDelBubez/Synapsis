/**
 * Calcoli sui tempi di percorrenza (nessun disegno qui: solo dati).
 *
 * - travelNetwork(): percorsi minimi tra tutti i luoghi (Floyd–Warshall) con un mezzo o con il più veloce.
 *   I luoghi annidati ereditano i percorsi del luogo che li contiene: se esiste "Villa → Stazione",
 *   vale anche per "Studio (nella Villa) → Stazione"; due stanze della stessa villa sono a 0 minuti.
 * - movementChecks(): per ogni personaggio, spostamenti tra eventi consecutivi (orari verità) in luoghi diversi,
 *   confrontati con il tempo di percorrenza → possibile / al limite / impossibile / percorso sconosciuto.
 */

/** "95" → "1 h 35 min" */
export function formatMinutes(minutes) {
    if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return '—';
    const m = Math.round(minutes);
    const sign = m < 0 ? '−' : '';
    const abs = Math.abs(m);
    if (abs < 60) return `${sign}${abs} min`;
    const rest = abs % 60;
    return `${sign}${Math.floor(abs / 60)} h${rest ? ` ${String(rest).padStart(2, '0')} min` : ''}`;
}

export const parseDateTime = (value) => (value ? new Date(String(value).replace(' ', 'T')) : null);

/**
 * @param {Array} places  luoghi (id, name, parent_id)
 * @param {Array} routes  percorsi (from_place_id, to_place_id, mode, minutes, two_way)
 * @param {string} mode   '' = qualsiasi mezzo (il più veloce), altrimenti solo quel mezzo
 */
export function travelNetwork(places, routes, mode = '') {
    const ids = places.map((p) => p.id);
    const index = new Map(ids.map((id, i) => [id, i]));
    const parent = new Map(places.map((p) => [p.id, p.parent_id ?? null]));
    const n = ids.length;
    const dist = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) => (i === j ? 0 : Infinity)));
    const next = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) => (i === j ? j : -1)));
    const direct = new Map(); // "a:b" → percorso più veloce diretto

    const add = (from, to, route) => {
        const i = index.get(from);
        const j = index.get(to);
        if (i === undefined || j === undefined || i === j) return;
        if (route.minutes < dist[i][j]) {
            dist[i][j] = route.minutes;
            next[i][j] = j;
            direct.set(`${from}:${to}`, route);
        }
    };
    routes.filter((r) => !mode || r.mode === mode).forEach((r) => {
        add(r.from_place_id, r.to_place_id, r);
        if (r.two_way) add(r.to_place_id, r.from_place_id, r);
    });

    for (let k = 0; k < n; k++) {
        for (let i = 0; i < n; i++) {
            if (dist[i][k] === Infinity) continue;
            for (let j = 0; j < n; j++) {
                const through = dist[i][k] + dist[k][j];
                if (through < dist[i][j]) {
                    dist[i][j] = through;
                    next[i][j] = next[i][k];
                }
            }
        }
    }

    /** Il luogo e tutti quelli che lo contengono, dal più vicino al più esterno. */
    const ancestors = (id) => {
        const chain = [];
        const seen = new Set();
        for (let cur = id; cur !== null && cur !== undefined && !seen.has(cur); cur = parent.get(cur) ?? null) {
            seen.add(cur);
            chain.push(cur);
        }
        return chain;
    };

    const pathBetween = (a, b) => {
        let i = index.get(a);
        const j = index.get(b);
        if (i === undefined || j === undefined || next[i][j] === -1) return [];
        const path = [ids[i]];
        while (i !== j) {
            i = next[i][j];
            path.push(ids[i]);
        }
        return path;
    };

    /**
     * Tempo minimo da a a b: { minutes, path: [id luoghi], from, to } oppure null se non c'è collegamento.
     * from/to sono i luoghi da cui parte e arriva davvero il percorso (possono essere i contenitori).
     */
    function best(a, b) {
        if (a === b) return { minutes: 0, path: [a], from: a, to: b };
        let found = null;
        for (const x of ancestors(a)) {
            for (const y of ancestors(b)) {
                const i = index.get(x);
                const j = index.get(y);
                if (i === undefined || j === undefined) continue;
                const minutes = dist[i][j];
                if (minutes < (found?.minutes ?? Infinity)) found = { minutes, from: x, to: y };
            }
        }
        return found ? { ...found, path: pathBetween(found.from, found.to) } : null;
    }

    /** Percorso diretto registrato tra due luoghi (in qualsiasi verso, se vale al ritorno). */
    const directRoute = (a, b) => direct.get(`${a}:${b}`) ?? null;

    return { best, directRoute };
}

/**
 * @returns {Array<{characterId, from: {event, placeId, time}, to: {event, placeId, time}, gap, need, path, status, claimed}>}
 */
export function movementChecks(events, participants, characters, network) {
    const eventById = new Map(events.map((e) => [e.id, e]));
    const byCharacter = new Map();
    participants.forEach((p) => {
        const e = eventById.get(p.event_id);
        if (!e || e.kind === 'false' || !e.real_start || !e.place_id) return;
        const start = parseDateTime(e.real_start);
        const end = parseDateTime(e.real_end) ?? start;
        const list = byCharacter.get(p.character_id) ?? [];
        list.push({ event: e, placeId: e.place_id, start, end, claimed: p.role === 'claimed' });
        byCharacter.set(p.character_id, list);
    });

    const checks = [];
    characters.forEach((c) => {
        const list = (byCharacter.get(c.id) ?? []).sort((a, b) => a.start - b.start || a.end - b.end);
        for (let k = 1; k < list.length; k++) {
            const prev = list[k - 1];
            const cur = list[k];
            if (prev.placeId === cur.placeId) continue;
            const gap = (cur.start - prev.end) / 60000;
            const route = network.best(prev.placeId, cur.placeId);
            let status;
            if (gap < 0) status = 'impossible';
            else if (!route) status = 'unknown';
            else if (gap < route.minutes) status = 'impossible';
            else if (gap - route.minutes <= Math.max(5, route.minutes * 0.1)) status = 'tight';
            else status = 'ok';
            checks.push({
                characterId: c.id,
                from: { event: prev.event, placeId: prev.placeId, time: prev.end },
                to: { event: cur.event, placeId: cur.placeId, time: cur.start },
                gap,
                need: route?.minutes ?? null,
                path: route?.path ?? [],
                status,
                claimed: prev.claimed || cur.claimed,
            });
        }
    });
    return checks;
}
