import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { apiGet, clearAdminToken } from '../../utils/api';
export default function AdminGuard({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [isAllowed, setIsAllowed] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    useEffect(() => {
        let isMounted = true;
        apiGet('/api/admin/me', true)
            .then(() => {
            if (isMounted) {
                setIsAllowed(true);
            }
        })
            .catch(() => {
            clearAdminToken();
            if (isMounted) {
                navigate('/login', { replace: true, state: { from: location.pathname } });
            }
        })
            .finally(() => {
            if (isMounted) {
                setIsChecking(false);
            }
        });
        return () => {
            isMounted = false;
        };
    }, [location.pathname, navigate]);
    if (isChecking) {
        return null;
    }
    if (!isAllowed) {
        return null;
    }
    return <>{children}</>;
}
