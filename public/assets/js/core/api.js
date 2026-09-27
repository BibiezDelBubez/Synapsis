/**
 * Client HTTP unico per le API di Sinapsi.
 * Legge la base URL dal <meta name="base-url"> generato dal server,
 * così funziona sia su virtual host sia in sottocartella.
 */
const BASE = (document.querySelector('meta[name="base-url"]')?.content || '/').replace(/\/+$/, '');

export class ApiError extends Error {
    constructor(status, message, details = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.details = details;
    }
}

async function request(method, path, body) {
    const options = { method, headers: { Accept: 'application/json' } };
    if (body !== undefined) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }

    let response;
    try {
        response = await fetch(`${BASE}/api/${path.replace(/^\/+/, '')}`, options);
    } catch (networkError) {
        throw new ApiError(0, 'Server non raggiungibile: XAMPP (Apache) è avviato?');
    }

    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
        const err = data?.error ?? {};
        throw new ApiError(response.status, err.message || `Errore HTTP ${response.status}`, err.details || {});
    }
    return data;
}

/** Carica un file (multipart) su /api/uploads e restituisce { path, width, height }. */
async function upload(file) {
    const body = new FormData();
    body.append('file', file);
    let response;
    try {
        response = await fetch(`${BASE}/api/uploads`, { method: 'POST', headers: { Accept: 'application/json' }, body });
    } catch {
        throw new ApiError(0, 'Server non raggiungibile: XAMPP (Apache) è avviato?');
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        const err = data?.error ?? {};
        throw new ApiError(response.status, err.message || `Errore HTTP ${response.status}`, err.details || {});
    }
    return data;
}

export const api = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    patch: (path, body) => request('PATCH', path, body),
    del: (path) => request('DELETE', path),
    upload,
};

/** URL di una pagina dell'app (per link generati via JS). */
export const url = (path = '/') => `${BASE}/${String(path).replace(/^\/+/, '')}`;
