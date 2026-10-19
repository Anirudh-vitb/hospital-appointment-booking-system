// Shared HTTP client for the CarePoint REST API. Every page talks to the
// backend through this one function so that cookies, the CSRF header, error
// messages and cold-start retries are handled the same way everywhere.

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const SLOW_REQUEST_MS = 4000;

let csrfToken = null;
export function setCsrfToken(token) {
  csrfToken = token;
}

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN', details = [] } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  // Field-level messages from the server, as { fieldName: message }.
  get fieldErrors() {
    return Object.fromEntries(this.details.map((d) => [d.field.split('.').pop(), d.message]));
  }
}

// Lets the ServerWakeNotice banner know when a request is unusually slow,
// which on free hosting usually means the backend is waking from sleep.
let slowCount = 0;
function trackSlow(delta) {
  slowCount = Math.max(0, slowCount + delta);
  window.dispatchEvent(new CustomEvent('carepoint:slow', { detail: slowCount > 0 }));
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildUrl(path, params) {
  const url = `${BASE_URL}${path}`;
  if (!params) return url;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const query = search.toString();
  return query ? `${url}?${query}` : url;
}

async function send(path, { method, body, params, signal }) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken;

  const response = await fetch(buildUrl(path, params), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'include', // send the session cookie
    signal,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON body, e.g. a hosting platform's HTML error page.
  }
  return { response, payload };
}

export async function api(path, { method = 'GET', body, params, signal } = {}) {
  // GET requests are retried on network errors and gateway errors because
  // a sleeping free-tier backend can take 30–60 s to accept connections.
  const attempts = method === 'GET' ? 4 : 1;
  let markedSlow = false;
  const slowTimer = setTimeout(() => {
    markedSlow = true;
    trackSlow(1);
  }, SLOW_REQUEST_MS);

  try {
    for (let attempt = 1; ; attempt += 1) {
      let result;
      try {
        result = await send(path, { method, body, params, signal });
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        if (attempt < attempts) {
          await wait(2000 * attempt);
          continue;
        }
        throw new ApiError(
          'Cannot reach the CarePoint server. Check your internet connection and try again — if the server was asleep it can take up to a minute to start.',
          { code: 'NETWORK' },
        );
      }

      const { response, payload } = result;
      if ([502, 503, 504].includes(response.status) && attempt < attempts && payload?.error?.code !== 'DATABASE_UNAVAILABLE') {
        await wait(2000 * attempt);
        continue;
      }

      if (response.ok && payload?.success) {
        return { data: payload.data, meta: payload.meta };
      }

      if (!payload?.error) {
        throw new ApiError(`The server sent an unexpected response (HTTP ${response.status}). Please try again.`, { status: response.status });
      }

      const error = new ApiError(payload.error.message, {
        status: response.status,
        code: payload.error.code,
        details: payload.error.details || [],
      });

      // The CSRF token is tied to the session; if the session expired on the
      // server, fetch a fresh token once and repeat the request.
      if (error.code === 'CSRF_INVALID' && attempt === 1) {
        const fresh = await send('/auth/session', { method: 'GET' });
        if (fresh.payload?.data?.csrfToken) {
          setCsrfToken(fresh.payload.data.csrfToken);
          window.dispatchEvent(new CustomEvent('carepoint:session', { detail: fresh.payload.data.user }));
          return await api(path, { method, body, params, signal });
        }
      }
      if (error.status === 401 && path !== '/auth/login') {
        window.dispatchEvent(new CustomEvent('carepoint:session', { detail: null }));
      }
      throw error;
    }
  } finally {
    clearTimeout(slowTimer);
    if (markedSlow) trackSlow(-1);
  }
}

export const apiGet = (path, params, options) => api(path, { ...options, params });
export const apiPost = (path, body) => api(path, { method: 'POST', body });
export const apiPut = (path, body) => api(path, { method: 'PUT', body });
export const apiPatch = (path, body) => api(path, { method: 'PATCH', body });
export const apiDelete = (path) => api(path, { method: 'DELETE' });
