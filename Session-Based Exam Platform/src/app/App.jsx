import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { apiGet } from './utils/api';
import { getSession, getSessionResetVersion, setSessionResetVersion } from './utils/sessionManager';

function AppLoading() {
    return (<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#d9ecff] via-[#cfe7ff] to-[#b9dafb] px-4 text-slate-900">
      <div className="rounded-2xl border border-[#1e5ba8]/20 bg-white/90 px-6 py-5 shadow-xl">
        <p className="text-lg font-semibold text-slate-950">Loading CBT system...</p>
        <p className="mt-1 text-sm text-slate-600">Synchronizing session state</p>
      </div>
    </div>);
}

export default function App() {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const bootstrap = async () => {
            try {
                const config = await apiGet('/api/config');
                setSessionResetVersion(config.sessionResetVersion || '0');
            }
            catch {
                setSessionResetVersion(getSessionResetVersion());
            }
            finally {
                if (isMounted) {
                    getSession();
                    setIsReady(true);
                }
            }
        };
        bootstrap();
        return () => {
            isMounted = false;
        };
    }, []);

    if (!isReady) {
        return <AppLoading />;
    }

    return <RouterProvider router={router}/>;
}
