import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Paper } from '@mui/material';
import { ArrowRight, Code2, DatabaseZap, FileCheck2, RotateCcw, ShieldCheck, TerminalSquare } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import logoImage from '../../imports/Screenshot_2026-05-22_134954.png';
import { clearSession, getSession } from '../utils/sessionManager';

export default function Home() {
    const navigate = useNavigate();
    const [hasStaleSession, setHasStaleSession] = useState(false);

    useEffect(() => {
        const session = getSession();
        setHasStaleSession(Boolean(session));
    }, []);

    const handleStart = () => {
        if (hasStaleSession) {
            clearSession();
        }
        navigate('/participant/biodata', { replace: true });
    };

    const handleStartNew = () => {
        clearSession();
        setHasStaleSession(false);
        navigate('/participant/biodata', { replace: true });
    };

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

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center">
        <Paper elevation={0} sx={{
            width: '100%',
            borderRadius: '20px',
            border: '1px solid rgba(30, 91, 168, 0.26)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(219,238,255,0.94))',
            boxShadow: '0 24px 70px rgba(30, 91, 168, 0.2)',
            overflow: 'hidden',
            backdropFilter: 'blur(16px)',
        }}>
          <div className="grid lg:grid-cols-[0.94fr_1.06fr]">
            <aside className="relative overflow-hidden bg-[#123f77] p-8 text-white sm:p-10">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:34px_34px]"/>
              <div className="absolute right-8 top-8 grid grid-cols-3 gap-2 opacity-50">
                {Array.from({ length: 9 }).map((_, index) => (<div key={index} className="h-7 w-7 rounded-md border border-white/25 bg-white/10"/>))}
              </div>
              <div className="relative flex h-full min-h-[480px] flex-col justify-between">
                <div>
                  <div className="mb-8 inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-1.5 font-mono text-xs text-blue-50">
                    <TerminalSquare className="h-4 w-4"/>
                    cbt.launch()
                  </div>
                  <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-xl bg-white/10 p-3 ring-1 ring-white/20">
                    <ImageWithFallback src={logoImage} alt="CBT System Logo" className="h-full w-full object-contain"/>
                  </div>
                  <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">
                    Tes Pengetahuan dan Praktik
                  </h1>
                  <p className="mt-4 max-w-lg text-base leading-7 text-blue-100">
                    Seleksi Calon Asisten Laboratorium Komputer.
                  </p>
                </div>

                <div className="mt-10 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/15 bg-white/10 p-4">
                    <ShieldCheck className="mb-3 h-5 w-5 text-cyan-200"/>
                    <p className="text-sm font-semibold text-white">Session Guard</p>
                    <p className="mt-1 text-sm leading-6 text-blue-100">Alur peserta terkunci sesuai tahap ujian.</p>
                  </div>
                  <div className="rounded-lg border border-white/15 bg-white/10 p-4">
                    <DatabaseZap className="mb-3 h-5 w-5 text-emerald-200"/>
                    <p className="text-sm font-semibold text-white">Auto-save</p>
                    <p className="mt-1 text-sm leading-6 text-blue-100">Jawaban tersimpan otomatis selama pengerjaan.</p>
                  </div>
                </div>
              </div>
            </aside>

            <section className="relative p-6 sm:p-8 lg:p-10">
              <div className="absolute right-6 top-6 grid grid-cols-3 gap-1 opacity-45">
                {Array.from({ length: 9 }).map((_, index) => (<div key={index} className="h-3 w-3 rounded-[3px] bg-[#1e5ba8]/20"/>))}
              </div>
              <div className="absolute bottom-5 right-8 font-mono text-4xl font-semibold text-[#1e5ba8]/10">&lt;start /&gt;</div>

              <div className="relative flex h-full min-h-[480px] flex-col justify-center">
                <div className="mb-7">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-[#1e5ba8]/25 bg-[#1e5ba8]/14 px-3 py-1 font-mono text-xs font-semibold text-[#1e5ba8]">
                    <Code2 className="h-4 w-4"/>
                    participant.entry
                  </div>
                  <h2 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
                    Mulai sesi ujian
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                    Isi Nama dan NPM, lanjutkan ke tahap ujian, lalu selesaikan project sesuai tema yang dipilih.
                  </p>
                </div>

                {hasStaleSession && (<div className="mb-5 rounded-lg border border-amber-300 bg-amber-50/90 p-4">
                  <div className="flex gap-3">
                    <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"/>
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Sesi peserta sebelumnya masih tersimpan.</p>
                      <p className="mt-1 text-sm leading-6 text-amber-800">
                        Memulai ujian dari halaman ini akan menghapus sesi lama dan membuat sesi peserta baru.
                      </p>
                    </div>
                  </div>
                </div>)}

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-[#1e5ba8]/16 bg-[#f5fbff] p-4">
                    <p className="font-mono text-xs font-semibold text-[#1e5ba8]">step_01</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">Biodata</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">Nama dan NPM</p>
                  </div>
                  <div className="rounded-lg border border-[#1e5ba8]/16 bg-[#f5fbff] p-4">
                    <p className="font-mono text-xs font-semibold text-[#1e5ba8]">step_02</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">Exam</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">Soal dan timer</p>
                  </div>
                  <div className="rounded-lg border border-[#1e5ba8]/16 bg-[#f5fbff] p-4">
                    <p className="font-mono text-xs font-semibold text-[#1e5ba8]">step_03</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">Project</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">Upload submission</p>
                  </div>
                </div>

                <div className="mt-7 rounded-xl border border-[#1e5ba8]/18 bg-white/70 p-3 shadow-sm">
                  <Button variant="contained" fullWidth size="large" endIcon={<ArrowRight />} onClick={handleStart} sx={{
            background: 'linear-gradient(135deg, #1e5ba8 0%, #0f8fbd 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #174c93 0%, #087ca8 100%)' },
            borderRadius: '10px',
            textTransform: 'none',
            fontSize: '16px',
            fontWeight: 700,
            padding: '12px',
        }}>
                    Mulai Ujian
                  </Button>
                  {hasStaleSession && (<Button variant="outlined" fullWidth startIcon={<RotateCcw />} onClick={handleStartNew} sx={{
            mt: 1.5,
            borderRadius: '10px',
            textTransform: 'none',
            fontSize: '15px',
            fontWeight: 700,
            padding: '10px',
            borderColor: 'rgba(30, 91, 168, 0.28)',
            color: '#1e5ba8',
            '&:hover': { borderColor: '#1e5ba8', backgroundColor: '#eef7ff' },
        }}>
                      Reset Sesi dan Mulai Baru
                    </Button>)}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><FileCheck2 className="h-4 w-4 text-[#1e5ba8]"/> Session-based system</span>
                  <span className="inline-flex items-center gap-1.5"><DatabaseZap className="h-4 w-4 text-[#1e5ba8]"/> Auto-save enabled</span>
                </div>
              </div>
            </section>
          </div>
        </Paper>
      </div>
    </div>);
}
