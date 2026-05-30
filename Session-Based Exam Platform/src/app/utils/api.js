const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
function getAdminToken() {
    return localStorage.getItem('cbt_admin_token');
}
async function request(path, options = {}, useAdminToken = false) {
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }
    if (useAdminToken) {
        const token = getAdminToken();
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
    }
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Request failed');
    }
    if (response.status === 204) {
        return {};
    }
    return response.json();
}
export function apiGet(path, useAdminToken = false) {
    return request(path, { method: 'GET' }, useAdminToken);
}
export function apiPost(path, body, useAdminToken = false) {
    return request(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }, useAdminToken);
}
export function apiPatch(path, body, useAdminToken = false) {
    return request(path, { method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body) }, useAdminToken);
}
export function apiDelete(path, useAdminToken = false) {
    return request(path, { method: 'DELETE' }, useAdminToken);
}
export function setAdminToken(token) {
    localStorage.setItem('cbt_admin_token', token);
}
export function clearAdminToken() {
    localStorage.removeItem('cbt_admin_token');
}
export function getApiBaseUrl() {
    return API_BASE_URL;
}
