// Session management utilities for CBT system
export const SESSION_KEY = 'cbt_session';
export const SESSION_RESET_VERSION_KEY = 'cbt_session_reset_version';

export function getSessionResetVersion() {
    return localStorage.getItem(SESSION_RESET_VERSION_KEY) || '0';
}

export function setSessionResetVersion(version) {
    localStorage.setItem(SESSION_RESET_VERSION_KEY, String(version || '0'));
}

export function createSession(biodata, overrides = {}) {
    const session = {
        participantId: overrides.participantId || generateId(),
        sessionToken: overrides.sessionToken || generateToken(),
        name: biodata.name || '',
        npm: biodata.npm || biodata.email || '',
        email: biodata.npm || biodata.email || '',
        phone: biodata.phone || '-',
        school: biodata.school || '-',
        institution: biodata.institution || '-',
        examTheme: '',
        examDurationMinutes: null,
        projectTheme: '',
        projectDurationMinutes: null,
        startTime: new Date().toISOString(),
        examAnswers: {},
        projectFiles: [],
        waitingFor: '',
        status: 'theme-selection',
        sessionVersion: getSessionResetVersion(),
    };
    saveSession(session);
    return session;
}
export function getSession() {
    const data = localStorage.getItem(SESSION_KEY);
    if (!data) {
        return null;
    }
    const session = JSON.parse(data);
    const sessionVersion = session?.sessionVersion || '0';
    const currentVersion = getSessionResetVersion();
    if (sessionVersion !== currentVersion) {
        clearSession();
        return null;
    }
    return session;
}
export function saveSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
export function updateSession(updates) {
    const session = getSession();
    if (session) {
        const updated = { ...session, ...updates };
        saveSession(updated);
    }
}
export function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('exam_timer');
    localStorage.removeItem('project_timer');
}
function generateId() {
    return `PART-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function generateToken() {
    return `TOKEN-${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;
}
// Auto-save functionality
let autoSaveTimeout = null;
export function autoSave(key, value, delay = 3000) {
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }
    autoSaveTimeout = setTimeout(() => {
        const session = getSession();
        if (session) {
            session.examAnswers[key] = value;
            saveSession(session);
        }
    }, delay);
}
