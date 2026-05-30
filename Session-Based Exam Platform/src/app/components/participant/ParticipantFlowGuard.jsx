import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { apiGet } from '../../utils/api';
import { clearSession, getSession, getSessionResetVersion, setSessionResetVersion } from '../../utils/sessionManager';

const STEP_PATHS = {
    biodata: '/participant/biodata',
    'theme-selection': '/participant/theme-selection',
    'waiting-exam': '/participant/waiting',
    'waiting-project': '/participant/waiting',
    exam: '/participant/exam',
    'project-theme': '/participant/project-theme',
    project: '/participant/project',
    completed: '/participant/complete',
};

function getActivePath(session) {
    if (!session) {
        return STEP_PATHS.biodata;
    }
    if (session.status && STEP_PATHS[session.status]) {
        return STEP_PATHS[session.status];
    }
    if (session.projectTheme) {
        return STEP_PATHS.project;
    }
    if (session.examTheme) {
        return STEP_PATHS.exam;
    }
    return STEP_PATHS['theme-selection'];
}

export default function ParticipantFlowGuard({ children, allowHome = false }) {
    const location = useLocation();
    const navigate = useNavigate();
    const session = getSession();
    const activePath = getActivePath(session);

    useEffect(() => {
        if (!session || allowHome || location.pathname !== activePath) {
            return undefined;
        }

        const state = { ...(window.history.state || {}), participantFlowLocked: true };
        window.history.replaceState(state, '', activePath);
        window.history.pushState(state, '', activePath);

        const keepParticipantOnCurrentStep = () => {
            window.history.pushState(state, '', activePath);
            navigate(activePath, { replace: true });
        };

        window.addEventListener('popstate', keepParticipantOnCurrentStep);
        return () => {
            window.removeEventListener('popstate', keepParticipantOnCurrentStep);
        };
    }, [activePath, allowHome, location.pathname, navigate, session]);

    useEffect(() => {
        if (!session) {
            return undefined;
        }

        let isMounted = true;
        let intervalId = null;

        const checkSessionVersion = async () => {
            try {
                const config = await apiGet('/api/config');
                const serverVersion = String(config.sessionResetVersion || '0');
                const currentVersion = getSessionResetVersion();
                if (serverVersion !== currentVersion) {
                    setSessionResetVersion(serverVersion);
                    clearSession();
                    if (isMounted) {
                        navigate('/', { replace: true });
                    }
                }
            }
            catch {
                // Ignore transient config errors.
            }
        };

        checkSessionVersion();
        intervalId = window.setInterval(checkSessionVersion, 15000);

        return () => {
            isMounted = false;
            if (intervalId) {
                window.clearInterval(intervalId);
            }
        };
    }, [navigate, session]);

    if (allowHome) {
        if (session && session.status !== 'theme-selection') {
            return <Navigate to={activePath} replace />;
        }
        return children;
    }

    if (!session) {
        if (location.pathname === STEP_PATHS.biodata) {
            return children;
        }
        return <Navigate to={STEP_PATHS.biodata} replace />;
    }

    if (location.pathname !== activePath) {
        return <Navigate to={activePath} replace />;
    }

    return children;
}
