import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, LinearProgress, Paper } from '@mui/material';
import { CheckCircle2, Code2, Home, ShieldCheck, TerminalSquare } from 'lucide-react';
import { clearSession } from '../../utils/sessionManager';

const CLEAR_DELAY_SECONDS = 5;

export default function ExamComplete() {
    const navigate = useNavigate();
    const [secondsLeft, setSecondsLeft] = useState(CLEAR_DELAY_SECONDS);

    useEffect(() => {
        if (secondsLeft <= 0) {
            clearSession();
            navigate('/', { replace: true });
            return undefined;
        }

        const timer = setTimeout(() => {
            setSecondsLeft((value) => Math.max(value - 1, 0));
        }, 1000);

        return () => clearTimeout(timer);
    }, [navigate, secondsLeft]);

    const handleGoHome = () => {
        clearSession();
        navigate('/', { replace: true });
    };

    const progress = ((CLEAR_DELAY_SECONDS - secondsLeft) / CLEAR_DELAY_SECONDS) * 100;

    return (<div className="min-h-screen overflow-hidden bg-gradient-to-br from-[#d9ecff] via-[#cfe7ff] to-[#b9dafb] px-4 py-6 text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-10 top-10 grid grid-cols-4 gap-2 opacity-35">
          {Array.from({ length: 16 }).map((_, index) => (<div key={index} className="h-7 w-7 rounded-md border border-[#1e5ba8]/35 bg-[#1e5ba8]/10"/>))}
        </div>
        <div className="absolute bottom-16 right-16 grid grid-cols-5 gap-2 opacity-25">
          {Array.from({ length: 15 }).map((_, index) => (<div key={index} className="h-5 w-5 rounded-[3px] border border-[#1e5ba8]/30 bg-white/25"/>))}
        </div>
        <div className="absolute bottom-20 left-1/4 font-mono text-7xl font-semibold leading-none text-[#1e5ba8]/10">{'{ }'}</div>
        <div className="absolute right-28 top-28 font-mono text-6xl font-semibold leading-none text-[#1e5ba8]/10">&lt;/&gt;</div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,91,168,0.075)_1px,transparent_1px),linear-gradient(90deg,rgba(30,91,168,0.075)_1px,transparent_1px)] bg-[size:46px_46px]"/>
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl items-center justify-center">
        <Paper elevation={0} sx={{
            width: '100%',
            borderRadius: '18px',
            border: '1px solid rgba(30, 91, 168, 0.26)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(219,238,255,0.94))',
            boxShadow: '0 24px 70px rgba(30, 91, 168, 0.2)',
            overflow: 'hidden',
            backdropFilter: 'blur(16px)',
        }}>
          <div className="relative overflow-hidden p-6 text-center sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#164a8f] via-[#1e5ba8] to-[#45a6e8]"/>
            <div className="absolute right-6 top-6 grid grid-cols-3 gap-1 opacity-45">
              {Array.from({ length: 9 }).map((_, index) => (<div key={index} className="h-3 w-3 rounded-[3px] bg-[#1e5ba8]/20"/>))}
            </div>
            <div className="absolute bottom-5 right-8 font-mono text-4xl font-semibold text-[#1e5ba8]/10">&lt;complete /&gt;</div>

            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-xl bg-[#1e5ba8] text-white shadow-xl shadow-blue-900/20">
              <CheckCircle2 className="h-12 w-12"/>
            </div>

            <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-[#1e5ba8]/25 bg-[#1e5ba8]/14 px-3 py-1 font-mono text-xs font-semibold text-[#1e5ba8]">
              <TerminalSquare className="h-4 w-4"/>
              session.complete()
            </div>

            <h1 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
              Exam Completed Successfully!
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Thank you for completing the exam. Your answers and project have been submitted successfully.
              Your session will be cleared automatically to prepare the system for the next participant.
            </p>

            <div className="mx-auto mt-6 grid max-w-2xl gap-3 text-left sm:grid-cols-[1fr_180px]">
              <div className="rounded-lg border border-[#1e5ba8]/16 bg-[#f5fbff] p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#1e5ba8]">
                  <ShieldCheck className="h-4 w-4"/>
                  What's Next?
                </div>
                <p className="text-sm leading-6 text-slate-700">
                  Your submission is being processed. Results will be reviewed by our team and you will be contacted via email regarding the outcome.
                </p>
              </div>

              <div className="rounded-lg border border-[#1e5ba8]/16 bg-[#e9f4ff] p-4">
                <div className="mb-2 flex items-center gap-2 font-mono text-xs font-semibold text-[#1e5ba8]">
                  <Code2 className="h-4 w-4"/>
                  clear.timer
                </div>
                <p className="text-4xl font-semibold text-slate-950">{secondsLeft}</p>
                <p className="mt-1 text-xs text-slate-600">seconds left</p>
                <LinearProgress variant="determinate" value={progress} sx={{
                    mt: 2,
                    height: 7,
                    borderRadius: 7,
                    backgroundColor: 'rgba(30, 91, 168, 0.14)',
                    '& .MuiLinearProgress-bar': {
                        borderRadius: 7,
                        background: 'linear-gradient(90deg, #1e5ba8 0%, #2f8bd3 70%, #4bb8ef 100%)',
                    },
                }}/>
              </div>
            </div>

            <div className="mt-7">
              <Button variant="contained" startIcon={<Home />} onClick={handleGoHome} sx={{
            minWidth: 220,
            background: 'linear-gradient(135deg, #1e5ba8 0%, #0f8fbd 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #174c93 0%, #087ca8 100%)' },
            borderRadius: '10px',
            textTransform: 'none',
            fontSize: '15px',
            fontWeight: 700,
            padding: '11px 24px',
        }}>
                Return to Home
              </Button>
            </div>

            <p className="mt-4 font-mono text-xs text-slate-500">
              {secondsLeft > 0 ? `Session will auto-clear in ${secondsLeft} seconds...` : 'Session cleared.'}
            </p>
          </div>
        </Paper>
      </div>
    </div>);
}
