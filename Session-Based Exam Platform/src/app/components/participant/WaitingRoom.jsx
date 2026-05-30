import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Paper } from '@mui/material';
import { Clock, ShieldCheck } from 'lucide-react';
import { apiGet } from '../../utils/api';
import { getSession, updateSession } from '../../utils/sessionManager';

const NEXT_PATH = {
    exam: '/participant/exam',
    project: '/participant/project',
    completed: '/participant/complete',
    'project-theme': '/participant/project-theme',
    'theme-selection': '/participant/theme-selection',
};

export default function WaitingRoom() {
    const navigate = useNavigate();
    const [initialSession] = useState(() => getSession());
    const [dots, setDots] = useState(1);
    const waitingLabel = useMemo(() => {
        if (initialSession?.status === 'waiting-project' || initialSession?.waitingFor === 'project') {
            return 'proyek';
        }
        return 'kuis';
    }, [initialSession]);

    useEffect(() => {
        if (!initialSession?.participantId) {
            navigate('/participant/biodata', { replace: true });
            return undefined;
        }
        if (!['waiting-exam', 'waiting-project'].includes(initialSession.status)) {
            navigate(NEXT_PATH[initialSession.status] || '/participant/theme-selection', { replace: true });
            return undefined;
        }

        let isMounted = true;
        const checkStatus = async () => {
            try {
                const participant = await apiGet(`/api/participants/${initialSession.participantId}/status`);
                if (!isMounted) {
                    return;
                }
                if (participant.status && participant.status !== initialSession.status && NEXT_PATH[participant.status]) {
                    updateSession({
                        status: participant.status,
                        examTheme: participant.examTheme || initialSession.examTheme,
                        projectTheme: participant.projectTheme || initialSession.projectTheme,
                        waitingFor: '',
                    });
                    navigate(NEXT_PATH[participant.status] || '/participant/theme-selection', { replace: true });
                }
            }
            catch {
                // Keep polling; transient API errors should not kick participants out.
            }
        };

        checkStatus();
        const statusInterval = window.setInterval(checkStatus, 3000);
        const dotInterval = window.setInterval(() => {
            setDots((value) => (value % 3) + 1);
        }, 500);

        return () => {
            isMounted = false;
            window.clearInterval(statusInterval);
            window.clearInterval(dotInterval);
        };
    }, [navigate, initialSession]);

    return (<div className="min-h-screen overflow-hidden bg-gradient-to-br from-[#d9ecff] via-[#cfe7ff] to-[#b9dafb] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-8 top-10 grid grid-cols-3 gap-2 opacity-35">
          {Array.from({ length: 9 }).map((_, index) => (<div key={index} className="h-8 w-8 rounded-md border border-[#1e5ba8]/35 bg-[#1e5ba8]/10"/>))}
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,91,168,0.075)_1px,transparent_1px),linear-gradient(90deg,rgba(30,91,168,0.075)_1px,transparent_1px)] bg-[size:46px_46px]"/>
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl items-center justify-center">
        <Paper elevation={0} sx={{
            borderRadius: '16px',
            border: '1px solid rgba(30, 91, 168, 0.26)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(219,238,255,0.94))',
            boxShadow: '0 14px 34px rgba(30, 91, 168, 0.18)',
            width: '100%',
            overflow: 'hidden',
        }}>
          <div className="relative p-6 text-center sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#1e5ba8] text-white shadow-lg shadow-blue-900/20">
              <Clock className="h-7 w-7"/>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-[#1e5ba8]/25 bg-[#1e5ba8]/14 px-2.5 py-1 text-xs font-semibold text-[#1e5ba8]">
              <ShieldCheck className="h-4 w-4"/>
              Ruang tunggu {waitingLabel}
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">Menunggu persetujuan admin{'.'.repeat(dots)}</h1>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Kamu sudah masuk antrean. Halaman ini akan otomatis lanjut saat admin mengizinkan kamu masuk ke {waitingLabel}.
            </p>
          </div>
        </Paper>
      </div>
    </div>);
}
