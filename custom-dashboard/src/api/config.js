// Zammad config — pure session-based auth
// The dashboard runs on the same domain as Zammad,
// so the session cookie is automatically sent with API requests.
// No API token required.

export function getConfig() {
    return {
        url: window.location.origin,
        token: null,
    };
}

export function isConfigured() {
    return true;
}
