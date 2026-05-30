import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button, Chip, Paper } from '@mui/material';
import { ArrowRight, Check, Lock, ShieldCheck } from 'lucide-react';
import { clearSession, getSession, updateSession } from '../../utils/sessionManager';
import { apiGet, apiPatch } from '../../utils/api';
import ThemeIcon from '../ui/ThemeIcon';

export default function ThemeSelection() {
    const navigate = useNavigate();
    const [themes, setThemes] = useState([]);
    const [selectedTheme, setSelectedTheme] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const session = getSession();
        if (!session) {
            navigate('/participant/biodata', { replace: true });
            return;
        }
        if (session.examTheme) {
            setSelectedTheme(session.examTheme);
            setIsLocked(true);
        }
        apiGet('/api/themes')
            .then(async (data) => {
                if (data.length === 0) {
                    updateSession({ examTheme: '', status: 'project-theme' });
                    if (session.participantId) {
                        try {
                            await apiPatch(`/api/participants/${session.participantId}`, {
                                status: 'project-theme',
                            });
                        }
                        catch {
                            // Keep the participant moving even if the status update is retried later.
                        }
                    }
                    navigate('/participant/project-theme', { replace: true });
                    return;
                }
                setThemes(data);
            })
            .finally(() => setIsLoading(false));
    }, [navigate]);

    const handleSelectTheme = (themeId) => {
        if (!isLocked) {
            setSelectedTheme(themeId);
        }
    };

    const handleConfirm = async () => {
        const session = getSession();
        if (selectedTheme && !isLocked) {
            const selectedDuration = selectedThemeData?.durationMinutes || 60;
            const config = await apiGet('/api/config').catch(() => ({ waitingRoomEnabled: false }));
            const nextStatus = config.waitingRoomEnabled ? 'waiting-exam' : 'exam';
            updateSession({ examTheme: selectedTheme, examDurationMinutes: selectedDuration, status: nextStatus, waitingFor: config.waitingRoomEnabled ? 'quiz' : '' });
            setIsLocked(true);
            if (session?.participantId) {
                await apiPatch(`/api/participants/${session.participantId}`, {
                    examTheme: selectedTheme,
                    status: nextStatus,
                });
            }
            setTimeout(() => {
                navigate(config.waitingRoomEnabled ? '/participant/waiting' : '/participant/exam', { replace: true });
            }, 500);
        }
        else if (isLocked) {
            const currentSession = getSession();
            navigate(currentSession?.status === 'waiting-exam' ? '/participant/waiting' : '/participant/exam', { replace: true });
        }
    };

    const selectedThemeData = themes.find((theme) => theme.id === selectedTheme);

    return (<div className="min-h-screen overflow-hidden bg-gradient-to-br from-[#d9ecff] via-[#cfe7ff] to-[#b9dafb] px-4 py-4 text-slate-900 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-8 top-10 grid grid-cols-3 gap-2 opacity-35">
          {Array.from({ length: 9 }).map((_, index) => (<div key={index} className="h-8 w-8 rounded-md border border-[#1e5ba8]/35 bg-[#1e5ba8]/10"/>))}
        </div>
        <div className="absolute right-10 top-20 grid grid-cols-4 gap-2 opacity-30">
          {Array.from({ length: 16 }).map((_, index) => (<div key={index} className="h-6 w-6 rounded border border-[#1e5ba8]/30 bg-white/25"/>))}
        </div>
        <div className="absolute bottom-12 left-1/4 font-mono text-7xl font-semibold leading-none text-[#1e5ba8]/10">{'{ }'}</div>
        <div className="absolute bottom-16 right-1/4 text-6xl font-semibold leading-none text-[#1e5ba8]/10">&lt;/&gt;</div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,91,168,0.075)_1px,transparent_1px),linear-gradient(90deg,rgba(30,91,168,0.075)_1px,transparent_1px)] bg-[size:46px_46px]"/>
      </div>

      <div className="relative mx-auto max-w-5xl">
        <Paper elevation={0} sx={{
            borderRadius: '16px',
            border: '1px solid rgba(30, 91, 168, 0.26)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(219,238,255,0.94))',
            boxShadow: '0 14px 34px rgba(30, 91, 168, 0.18)',
            backdropFilter: 'blur(16px)',
        }}>
          <div className="relative overflow-hidden rounded-[16px]">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#1e5ba8] via-[#2f8bd3] to-cyan-400"/>
            <div className="absolute right-4 top-4 grid grid-cols-3 gap-1 opacity-45">
              {Array.from({ length: 9 }).map((_, index) => (<div key={index} className="h-3 w-3 rounded-[3px] bg-[#1e5ba8]/20"/>))}
            </div>
            <div className="absolute bottom-3 right-28 font-mono text-3xl font-semibold text-[#1e5ba8]/10">&lt;code&gt;</div>
            <div className="flex flex-col gap-3 p-4 pl-6 sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:pl-7">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-[#1e5ba8]/25 bg-[#1e5ba8]/14 px-2.5 py-1 text-xs font-semibold text-[#1e5ba8] shadow-sm shadow-blue-900/5">
                <ShieldCheck className="h-4 w-4"/>
                {isLocked ? 'Theme locked' : 'Final selection'}
              </div>
              <h1 className="text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">Select Your Exam Theme</h1>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">
                {isLocked ? 'Your theme is locked and cannot be changed.' : 'Choose one theme. This choice cannot be changed after confirmation.'}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 rounded-md border border-[#1e5ba8]/20 bg-[#e9f4ff]/90 px-3 py-2 shadow-sm">
              <div className={`flex h-9 w-9 items-center justify-center rounded-md ${isLocked ? 'bg-emerald-100 text-emerald-700' : selectedTheme ? 'bg-[#1e5ba8] text-white' : 'bg-blue-100 text-[#1e5ba8]'}`}>
                {isLocked ? <Lock className="h-4 w-4"/> : <Check className="h-4 w-4"/>}
              </div>
              <div className="min-w-0">
                <p className="max-w-[220px] truncate text-sm font-semibold text-slate-950">
                  {selectedThemeData ? selectedThemeData.name : 'No theme selected'}
                </p>
                <p className="text-xs text-slate-500">{themes.length} themes available</p>
              </div>
            </div>
            </div>
          </div>
        </Paper>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {isLoading && themes.length === 0 && Array.from({ length: 5 }).map((_, index) => (<Paper key={index} elevation={0} sx={{
                borderRadius: '14px',
                border: '1px solid rgba(148, 163, 184, 0.22)',
                background: 'rgba(255,255,255,0.72)',
            }} className="h-[136px] animate-pulse p-4">
              <div className="h-10 w-10 rounded-md bg-slate-200"/>
              <div className="mt-4 h-5 w-40 rounded bg-slate-200"/>
              <div className="mt-3 h-4 w-56 max-w-full rounded bg-slate-100"/>
            </Paper>))}

          {themes.map((theme) => {
              const isSelected = selectedTheme === theme.id;
              const isUnavailable = isLocked && !isSelected;

              return (<Paper key={theme.id} elevation={isSelected ? 6 : 1} onClick={() => handleSelectTheme(theme.id)} sx={{
                borderRadius: '14px',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                opacity: isUnavailable ? 0.46 : 1,
                transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease',
                border: isSelected ? '2px solid #1e5ba8' : '1px solid rgba(148, 163, 184, 0.24)',
                background: isSelected
                    ? 'linear-gradient(135deg, #f7fbff 0%, #dceeff 56%, #c8e4ff 100%)'
                    : 'linear-gradient(180deg, rgba(245,250,255,0.96), rgba(229,242,255,0.92))',
                boxShadow: isSelected
                    ? '0 14px 30px rgba(30, 91, 168, 0.25)'
                    : '0 8px 20px rgba(30, 91, 168, 0.13)',
                backdropFilter: 'blur(12px)',
                '&:hover': !isLocked
                    ? {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 14px 30px rgba(30, 91, 168, 0.2)',
                        borderColor: '#4f93d0',
                    }
                    : {},
            }} className="group relative min-h-[138px] overflow-hidden p-4">
                <div className={`absolute inset-x-0 top-0 h-1.5 ${isSelected ? 'bg-gradient-to-r from-[#164a8f] via-[#1e5ba8] to-[#45a6e8]' : 'bg-gradient-to-r from-[#1e5ba8]/28 via-[#5ba6e8]/18 to-[#1e5ba8]/10'}`}/>
                <div className="absolute right-4 top-4 grid grid-cols-3 gap-1 opacity-55 transition group-hover:opacity-85">
                  {Array.from({ length: 9 }).map((_, index) => (<div key={index} className={`h-2.5 w-2.5 rounded-[2px] border ${isSelected ? 'border-[#1e5ba8]/30 bg-[#1e5ba8]/24' : 'border-[#1e5ba8]/18 bg-[#1e5ba8]/10'}`}/>))}
                </div>
                <div className="absolute bottom-12 right-16 font-mono text-[11px] font-semibold text-[#1e5ba8]/22">
                  {isSelected ? 'theme.lock()' : 'select(theme)'}
                </div>

                <div className="absolute right-4 top-[52px]">
                  {isSelected && (<div className="rounded-md bg-[#1e5ba8] p-1.5 shadow-lg shadow-blue-900/20">
                    <Check className="h-4 w-4 text-white"/>
                  </div>)}
                  {isUnavailable && (<Lock className="h-5 w-5 text-slate-400"/>)}
                </div>

                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-2xl shadow-sm transition ${isSelected ? 'bg-[#1e5ba8] shadow-blue-900/20' : 'bg-[#d7ecff] shadow-blue-900/5 group-hover:bg-[#c8e4ff]'}`}>
                    <ThemeIcon value={theme.icon} className="h-9 w-9" fallbackClassName="h-5 w-5"/>
                  </div>
                  <div className="min-w-0 pr-8">
                    <h3 className="truncate text-lg font-semibold text-slate-950">{theme.name}</h3>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-slate-600">{theme.description}</p>
                    <p className="mt-1 text-xs font-semibold text-[#1e5ba8]">{theme.durationMinutes || 60} menit</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-blue-100 pt-2.5">
                  <span className={`text-xs font-semibold ${isSelected ? 'text-[#1e5ba8]' : 'text-slate-500'}`}>
                    {isSelected ? (isLocked ? 'Selected' : 'Ready to confirm') : isLocked ? 'Unavailable' : 'Tap to select'}
                  </span>
                  <div className={`flex h-7 w-7 items-center justify-center rounded-md transition ${isSelected ? 'bg-[#1e5ba8] text-white shadow-md shadow-blue-900/20' : 'bg-blue-50 text-[#1e5ba8] group-hover:bg-[#1e5ba8] group-hover:text-white'}`}>
                    <ArrowRight className="h-4 w-4"/>
                  </div>
                </div>

                {isSelected && isLocked && (<Chip label="Selected" color="primary" size="small" sx={{ mt: 1.5 }}/>)}
              </Paper>);
          })}
        </div>

        <div className="sticky bottom-4 z-10 mt-4 flex justify-center">
          <Paper elevation={0} sx={{
            width: { xs: '100%', sm: 'auto' },
            borderRadius: '12px',
            border: '1px solid rgba(30, 91, 168, 0.24)',
            background: 'rgba(231, 243, 255, 0.94)',
            boxShadow: '0 14px 38px rgba(30, 91, 168, 0.2)',
            backdropFilter: 'blur(16px)',
            padding: '6px',
        }}>
            <Button variant="contained" size="large" disabled={!selectedTheme || isLoading} onClick={handleConfirm} endIcon={<ArrowRight />} sx={{
            width: { xs: '100%', sm: '286px' },
            background: 'linear-gradient(135deg, #1e5ba8 0%, #0f8fbd 100%)',
            boxShadow: '0 12px 28px rgba(30, 91, 168, 0.24)',
            '&:hover': {
                background: 'linear-gradient(135deg, #174c93 0%, #087ca8 100%)',
                boxShadow: '0 14px 30px rgba(30, 91, 168, 0.3)',
            },
            borderRadius: '10px',
            textTransform: 'none',
            fontSize: '15px',
            fontWeight: 700,
            padding: '10px 18px',
            '&:disabled': {
                backgroundColor: '#cbd5e1',
                backgroundImage: 'none',
                boxShadow: 'none',
            },
        }}>
              {isLocked ? 'Continue to Exam' : 'Confirm Selection'}
            </Button>
          </Paper>
        </div>

        <div className="mt-3 flex justify-center">
          <Button variant="text" onClick={() => {
            clearSession();
            navigate('/');
          }} sx={{
            textTransform: 'none',
            color: '#475569',
          }}>
            Keluar dan mulai peserta baru
          </Button>
        </div>

        {!isLocked && selectedTheme && (<div className="mt-4 text-center">
          <p className="text-sm font-medium text-amber-700">
            Warning: Once confirmed, you cannot change your theme selection.
          </p>
        </div>)}
      </div>
    </div>);
}
